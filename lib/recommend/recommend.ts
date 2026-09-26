import type { SupabaseClient } from "@supabase/supabase-js";
import type { ConversationTags } from "@/lib/church/types";
import type { RecommendationRecord, RecommendResult, SongResult, VerseResult } from "./types";

const RECENCY_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
const TOP_CANDIDATE_COUNT = 5;

interface TaggedSong {
  id: string;
  title: string;
  artist: string;
  listenUrl: string | null;
  themes: string[];
  situations: string[];
  moods: string[];
}

interface TaggedVerse {
  id: string;
  reference: string;
  body: string;
  translation: string;
  themes: string[];
  situations: string[];
}

interface RawTagLink {
  name: string;
}

interface RawSongRow {
  id: string;
  title: string;
  artist: string;
  listen_url: string | null;
  song_themes: { themes: RawTagLink | null }[] | null;
  song_situations: { situations: RawTagLink | null }[] | null;
  song_moods: { moods: RawTagLink | null }[] | null;
}

interface RawVerseRow {
  id: string;
  reference: string;
  body: string;
  translation: string;
  verse_themes: { themes: RawTagLink | null }[] | null;
  verse_situations: { situations: RawTagLink | null }[] | null;
}

function namesOf(links: { [key: string]: RawTagLink | null }[] | null, key: string): string[] {
  if (!links) return [];
  return links
    .map((link) => link[key]?.name)
    .filter((name): name is string => Boolean(name));
}

async function fetchTaggedSongs(supabase: SupabaseClient): Promise<TaggedSong[]> {
  const { data, error } = await supabase
    .from("songs")
    .select(
      "id, title, artist, listen_url, song_themes(themes(name)), song_situations(situations(name)), song_moods(moods(name))",
    )
    .eq("is_reviewed", true)
    .eq("is_active", true);
  if (error) throw error;

  // Database 제네릭이 없어 supabase-js가 중첩 임베드 카디널리티를 정확히
  // 추론하지 못한다 (실제로는 song_themes.themes는 단일 객체지만 배열로 잡힘) —
  // unknown을 거쳐 실제 런타임 형태(RawSongRow)로 캐스팅한다.
  return ((data ?? []) as unknown as RawSongRow[]).map((row) => ({
    id: row.id,
    title: row.title,
    artist: row.artist,
    listenUrl: row.listen_url,
    themes: namesOf(row.song_themes, "themes"),
    situations: namesOf(row.song_situations, "situations"),
    moods: namesOf(row.song_moods, "moods"),
  }));
}

async function fetchTaggedVerses(supabase: SupabaseClient): Promise<TaggedVerse[]> {
  const { data, error } = await supabase
    .from("verses")
    .select(
      "id, reference, body, translation, verse_themes(themes(name)), verse_situations(situations(name))",
    )
    .eq("is_reviewed", true)
    .eq("is_active", true);
  if (error) throw error;

  return ((data ?? []) as unknown as RawVerseRow[]).map((row) => ({
    id: row.id,
    reference: row.reference,
    body: row.body,
    translation: row.translation,
    themes: namesOf(row.verse_themes, "themes"),
    situations: namesOf(row.verse_situations, "situations"),
  }));
}

function overlapCount(a: string[], b: string[]): number {
  return a.filter((value) => b.includes(value)).length;
}

function recentIdsWithinWindow(
  history: RecommendationRecord[],
  key: "songId" | "verseId",
  now: number,
): Set<string> {
  const ids = new Set<string>();
  for (const record of history) {
    const id = record[key];
    if (!id) continue;
    const recordedAt = new Date(record.date).getTime();
    if (Number.isFinite(recordedAt) && now - recordedAt < RECENCY_WINDOW_MS) {
      ids.add(id);
    }
  }
  return ids;
}

/**
 * F-08 선택 순서: 점수 기준 상위 5개 중 랜덤 1개. 후보가 없으면 다음
 * scorer(조건이 완화된 채점 기준)로 넘어간다. scorers를 다 써도 후보가
 * 없으면(전부 0점) 전체 랜덤으로 최종 완화한다.
 */
function pickWithFallback<T>(pool: T[], scorers: Array<(item: T) => number>): T | null {
  for (const scorer of scorers) {
    const scored = pool
      .map((item) => ({ item, score: scorer(item) }))
      .filter((entry) => entry.score > 0);
    if (scored.length === 0) continue;
    scored.sort((a, b) => b.score - a.score);
    const top = scored.slice(0, TOP_CANDIDATE_COUNT);
    return top[Math.floor(Math.random() * top.length)].item;
  }
  if (pool.length === 0) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}

export interface RecommendOptions {
  supabase: SupabaseClient;
  tags: ConversationTags;
  history: RecommendationRecord[];
  include?: { verse?: boolean; song?: boolean };
}

export async function recommend({
  supabase,
  tags,
  history,
  include,
}: RecommendOptions): Promise<RecommendResult> {
  const now = Date.now();
  const wantSong = include?.song ?? true;
  const wantVerse = include?.verse ?? true;

  const [songs, verses] = await Promise.all([
    wantSong ? fetchTaggedSongs(supabase) : Promise.resolve([]),
    wantVerse ? fetchTaggedVerses(supabase) : Promise.resolve([]),
  ]);

  let song: SongResult | null = null;
  if (wantSong) {
    const excludeIds = recentIdsWithinWindow(history, "songId", now);
    const withoutRecent = songs.filter((item) => !excludeIds.has(item.id));
    // 제외 후 후보가 아예 없으면(방금 다 추천했음) 최근 기록 제외를 무시하고 전체 풀로 완화
    const pool = withoutRecent.length > 0 ? withoutRecent : songs;
    const picked = pickWithFallback(pool, [
      (item) =>
        (tags.situation && item.situations.includes(tags.situation) ? 1 : 0) +
        overlapCount(item.themes, tags.themes) +
        overlapCount(item.moods, tags.moods),
      (item) => overlapCount(item.themes, tags.themes) + overlapCount(item.moods, tags.moods),
    ]);
    song = picked
      ? { id: picked.id, title: picked.title, artist: picked.artist, listenUrl: picked.listenUrl }
      : null;
  }

  let verse: VerseResult | null = null;
  if (wantVerse) {
    const excludeIds = recentIdsWithinWindow(history, "verseId", now);
    const withoutRecent = verses.filter((item) => !excludeIds.has(item.id));
    const pool = withoutRecent.length > 0 ? withoutRecent : verses;
    const picked = pickWithFallback(pool, [
      (item) =>
        (tags.situation && item.situations.includes(tags.situation) ? 1 : 0) +
        overlapCount(item.themes, tags.themes),
      (item) => overlapCount(item.themes, tags.themes),
    ]);
    verse = picked
      ? {
          id: picked.id,
          reference: picked.reference,
          body: picked.body,
          translation: picked.translation,
        }
      : null;
  }

  return { verse, song };
}
