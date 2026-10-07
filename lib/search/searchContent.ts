import "server-only";
import { supabaseAdmin } from "@/shared/lib/supabase-client";
import { getBibleBooks } from "@/lib/catalog/catalogCache";
import { fetchAllRows } from "@/lib/search/fetchAllRows";
import type { SearchFilters } from "@/lib/search/searchQuery";
import type { SongResult, VerseResult } from "@/lib/recommend/types";

const FETCH_CHUNK = 50;

export interface SearchPage<T> {
  items: T[];
  total: number;
}

async function idsMatchingTags(kind: "verse" | "song", filters: SearchFilters): Promise<Set<string> | null> {
  const groups: { table: string; column: string; ids: string[] }[] = [
    { table: `${kind}_themes`, column: "theme_id", ids: filters.theme },
    { table: `${kind}_situations`, column: "situation_id", ids: filters.situation },
  ];
  if (kind === "song") groups.push({ table: "song_moods", column: "mood_id", ids: filters.mood });

  const matchedSets = await Promise.all(
    groups
      .filter((group) => group.ids.length > 0)
      .map(async (group) => {
        const rows = await fetchAllRows<Record<string, string>>((from, to) =>
          supabaseAdmin.from(group.table).select(`${kind}_id`).in(group.column, group.ids).order(`${kind}_id`).order(group.column).range(from, to),
        );
        return new Set(rows.map((row) => row[`${kind}_id`]));
      }),
  );
  if (matchedSets.length === 0) return null;
  const [first, ...rest] = matchedSets;
  return new Set([...first].filter((id) => rest.every((set) => set.has(id))));
}

async function resolveBookIds(filters: SearchFilters): Promise<number[] | null> {
  if (!filters.testament && !filters.book) return null;
  const books = await getBibleBooks();
  return books
    .filter(
      (book) =>
        (!filters.testament || book.testament === filters.testament) &&
        (!filters.category || book.category === filters.category) &&
        (!filters.book || book.id === filters.book),
    )
    .map((book) => book.id);
}

async function fetchByIds<T extends { id: string }>(
  table: "verses" | "songs",
  columns: string,
  ids: string[],
): Promise<Map<string, T>> {
  const chunks: string[][] = [];
  for (let i = 0; i < ids.length; i += FETCH_CHUNK) chunks.push(ids.slice(i, i + FETCH_CHUNK));
  const results = await Promise.all(
    chunks.map(async (chunk) => {
      const { data, error } = await supabaseAdmin.from(table).select(columns).in("id", chunk);
      if (error) throw error;
      return (data ?? []) as unknown as T[];
    }),
  );
  return new Map(results.flat().map((row) => [row.id, row]));
}

// bookmarkedIds는 회원별 데이터라 호출자가 요청 단위로 넘긴다 (카탈로그 캐시에 섞지 않는다).
export async function searchVerses(
  filters: SearchFilters,
  offset = 0,
  bookmarkedIds: string[] = [],
): Promise<SearchPage<VerseResult>> {
  if (filters.bookmarked && bookmarkedIds.length === 0) return { items: [], total: 0 };
  const [bookIds, tagIds] = await Promise.all([resolveBookIds(filters), idsMatchingTags("verse", filters)]);
  if (bookIds && bookIds.length === 0) return { items: [], total: 0 };

  const candidates = await fetchAllRows<{ id: string }>((from, to) => {
    let query = supabaseAdmin.from("verses").select("id").eq("is_reviewed", true).eq("is_active", true);
    if (bookIds) query = query.in("book_id", bookIds);
    if (filters.chapter) query = query.eq("chapter", filters.chapter);
    return query.order("book_id").order("chapter").order("verse_start").order("id").range(from, to);
  });

  const bookmarkedSet = filters.bookmarked ? new Set(bookmarkedIds) : null;
  const matched = candidates
    .map((row) => row.id)
    .filter((id) => (!tagIds || tagIds.has(id)) && (!bookmarkedSet || bookmarkedSet.has(id)));
  const pageIds = matched.slice(offset, offset + filters.limit);
  const rows = await fetchByIds<VerseResult>(
    "verses",
    "id, reference, body, translation, meaning, application",
    pageIds,
  );

  return { items: pageIds.flatMap((id) => rows.get(id) ?? []), total: matched.length };
}

// PostgREST or-필터 구분자와 ilike 와일드카드가 입력에 섞이면 필터 문법이 깨지므로 공백으로 치환한다.
function sanitizeKeyword(keyword: string): string {
  return keyword.replace(/[%_*\\,()"]/g, " ").replace(/\s+/g, " ").trim();
}

export async function searchSongs(
  filters: SearchFilters,
  offset = 0,
  bookmarkedIds: string[] = [],
): Promise<SearchPage<SongResult>> {
  if (filters.bookmarked && bookmarkedIds.length === 0) return { items: [], total: 0 };
  const keyword = sanitizeKeyword(filters.q);

  const [tagIds, candidates] = await Promise.all([
    idsMatchingTags("song", filters),
    fetchAllRows<{ id: string }>((from, to) => {
      let query = supabaseAdmin.from("songs").select("id").eq("is_reviewed", true).eq("is_active", true);
      if (keyword) query = query.or(`title.ilike."%${keyword}%",artist.ilike."%${keyword}%"`);
      return query.order("title").order("id").range(from, to);
    }),
  ]);

  const bookmarkedSet = filters.bookmarked ? new Set(bookmarkedIds) : null;
  const matched = candidates
    .map((row) => row.id)
    .filter((id) => (!tagIds || tagIds.has(id)) && (!bookmarkedSet || bookmarkedSet.has(id)));
  const pageIds = matched.slice(offset, offset + filters.limit);
  const rows = await fetchByIds<{
    id: string;
    title: string;
    artist: string;
    listen_url: string | null;
    summary: string | null;
  }>("songs", "id, title, artist, listen_url, summary", pageIds);

  const items = pageIds.flatMap((id) => {
    const row = rows.get(id);
    return row
      ? [{ id: row.id, title: row.title, artist: row.artist, listenUrl: row.listen_url, summary: row.summary }]
      : [];
  });
  return { items, total: matched.length };
}
