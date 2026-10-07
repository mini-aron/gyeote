import "server-only";
import { unstable_cache } from "next/cache";
import { supabaseAdmin } from "@/shared/lib/supabase-client";
import { fetchAllRows } from "@/lib/search/fetchAllRows";
import type { BookOption, TagOption } from "@/lib/search/types";

const CATALOG_TAG = "catalog";
const CATALOG_REVALIDATE_SECONDS = 3600;

const CATALOG_CACHE_OPTIONS = { tags: [CATALOG_TAG], revalidate: CATALOG_REVALIDATE_SECONDS };

export interface TaggedSong {
  id: string;
  title: string;
  artist: string;
  listenUrl: string | null;
  summary: string | null;
  themes: string[];
  situations: string[];
  moods: string[];
}

export interface TaggedVerse {
  id: string;
  reference: string;
  body: string;
  translation: string;
  meaning: string | null;
  application: string | null;
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
  summary: string | null;
  song_themes: { themes: RawTagLink | null }[] | null;
  song_situations: { situations: RawTagLink | null }[] | null;
  song_moods: { moods: RawTagLink | null }[] | null;
}

interface RawVerseRow {
  id: string;
  reference: string;
  body: string;
  translation: string;
  meaning: string | null;
  application: string | null;
  verse_themes: { themes: RawTagLink | null }[] | null;
  verse_situations: { situations: RawTagLink | null }[] | null;
}

function namesOf(links: { [key: string]: RawTagLink | null }[] | null, key: string): string[] {
  if (!links) return [];
  return links
    .map((link) => link[key]?.name)
    .filter((name): name is string => Boolean(name));
}

export const getTaggedSongs = unstable_cache(
  async (): Promise<TaggedSong[]> => {
    const { data, error } = await supabaseAdmin
      .from("songs")
      .select(
        "id, title, artist, listen_url, summary, song_themes(themes(name)), song_situations(situations(name)), song_moods(moods(name))",
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
      summary: row.summary,
      themes: namesOf(row.song_themes, "themes"),
      situations: namesOf(row.song_situations, "situations"),
      moods: namesOf(row.song_moods, "moods"),
    }));
  },
  ["catalog:tagged-songs"],
  CATALOG_CACHE_OPTIONS,
);

export const getTaggedVerses = unstable_cache(
  async (): Promise<TaggedVerse[]> => {
    const { data, error } = await supabaseAdmin
      .from("verses")
      .select(
        "id, reference, body, translation, meaning, application, verse_themes(themes(name)), verse_situations(situations(name))",
      )
      .eq("is_reviewed", true)
      .eq("is_active", true);
    if (error) throw error;

    return ((data ?? []) as unknown as RawVerseRow[]).map((row) => ({
      id: row.id,
      reference: row.reference,
      body: row.body,
      translation: row.translation,
      meaning: row.meaning,
      application: row.application,
      themes: namesOf(row.verse_themes, "themes"),
      situations: namesOf(row.verse_situations, "situations"),
    }));
  },
  ["catalog:tagged-verses"],
  CATALOG_CACHE_OPTIONS,
);

export type TagTable = "themes" | "situations" | "moods";

function cachedTagOptions(table: TagTable) {
  return unstable_cache(
    async (): Promise<TagOption[]> => {
      const { data, error } = await supabaseAdmin.from(table).select("id, name").order("name");
      if (error) throw error;
      return (data ?? []) as TagOption[];
    },
    [`catalog:tag-options:${table}`],
    CATALOG_CACHE_OPTIONS,
  );
}

const tagOptionsByTable: Record<TagTable, () => Promise<TagOption[]>> = {
  themes: cachedTagOptions("themes"),
  situations: cachedTagOptions("situations"),
  moods: cachedTagOptions("moods"),
};

export function getTagOptions(table: TagTable): Promise<TagOption[]> {
  return tagOptionsByTable[table]();
}

export type BibleBook = Omit<BookOption, "hasVerses">;

export const getBibleBooks = unstable_cache(
  async (): Promise<BibleBook[]> => {
    const { data, error } = await supabaseAdmin
      .from("bible_books")
      .select("id, name, testament, category")
      .order("id");
    if (error) throw error;
    return (data ?? []) as BibleBook[];
  },
  ["catalog:bible-books"],
  CATALOG_CACHE_OPTIONS,
);

// book_id -> 오름차순 장 목록. Map/Set은 캐시 직렬화가 안 되어 plain object로 둔다.
export const getVerseChapterIndex = unstable_cache(
  async (): Promise<Record<string, number[]>> => {
    const rows = await fetchAllRows<{ book_id: number; chapter: number }>((from, to) =>
      supabaseAdmin
        .from("verses")
        .select("book_id, chapter")
        .eq("is_reviewed", true)
        .eq("is_active", true)
        .order("id")
        .range(from, to),
    );
    const sets = new Map<number, Set<number>>();
    for (const row of rows) {
      const set = sets.get(row.book_id) ?? new Set<number>();
      set.add(row.chapter);
      sets.set(row.book_id, set);
    }
    return Object.fromEntries(
      [...sets].map(([bookId, chapters]) => [String(bookId), [...chapters].sort((a, b) => a - b)]),
    );
  },
  ["catalog:verse-chapter-index"],
  CATALOG_CACHE_OPTIONS,
);
