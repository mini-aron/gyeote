import type { ConversationTags } from "@/lib/analysis/types";
import { getTaggedSongs, getTaggedVerses } from "@/lib/catalog/catalogCache";
import type { RecommendationRecord, RecommendResult, SongResult, VerseResult } from "./types";

const RECENCY_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
const TOP_CANDIDATE_COUNT = 5;

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
  tags: ConversationTags;
  history: RecommendationRecord[];
  include?: { verse?: boolean; song?: boolean };
}

export async function recommend({
  tags,
  history,
  include,
}: RecommendOptions): Promise<RecommendResult> {
  const now = Date.now();
  const wantSong = include?.song ?? true;
  const wantVerse = include?.verse ?? true;

  const [songs, verses] = await Promise.all([
    wantSong ? getTaggedSongs() : Promise.resolve([]),
    wantVerse ? getTaggedVerses() : Promise.resolve([]),
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
      ? {
          id: picked.id,
          title: picked.title,
          artist: picked.artist,
          listenUrl: picked.listenUrl,
          summary: picked.summary,
        }
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
          meaning: picked.meaning,
          application: picked.application,
        }
      : null;
  }

  return { verse, song };
}
