import "server-only";
import { supabaseAdmin } from "@/shared/lib/supabase-client";
import { getBibleBooks } from "@/lib/catalog/catalogCache";
import { parseReference, PSALMS_BOOK_ID, type ParsedReference } from "@/lib/search/parseReference";
import { pickSuggestions, relaxationCandidates, type RelaxSuggestion } from "@/lib/search/relax";
import { buildSearchHref, type SearchFilters } from "@/lib/search/searchQuery";
import type { SongResult, VerseResult } from "@/lib/recommend/types";

export interface SearchPage<T> {
  items: T[];
  total: number;
  matchedReference?: string;
}

// search_* 함수에서 빈 배열은 "아무것도 매칭 안 함"이라, 선택 안 한 태그는 null로 넘겨야 한다.
function tagsOrNull(ids: string[]): string[] | null {
  return ids.length > 0 ? ids : null;
}

function onlyIds(filters: SearchFilters, bookmarkedIds: string[]): string[] | null {
  return filters.bookmark === "only" ? bookmarkedIds : null;
}

// p_exclude_ids가 없는 옛 함수도 호출되도록, 제외할 때만 인자를 싣는다.
function excludeIds(filters: SearchFilters, bookmarkedIds: string[]): { p_exclude_ids?: string[] } {
  return filters.bookmark === "exclude" ? { p_exclude_ids: bookmarkedIds } : {};
}

// count(*) over ()는 결과 행이 없으면 total도 없어서, offset이 끝을 넘은 경우 지금까지 본 개수로 수렴시킨다.
function totalOf(rows: { total: number | string }[], offset: number): number {
  return rows.length > 0 ? Number(rows[0].total) : offset;
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

function describeReference(ref: ParsedReference, bookName: string): string {
  if (ref.chapter === undefined) return bookName;
  if (ref.verse !== undefined) return `${bookName} ${ref.chapter}:${ref.verse}`;
  return `${bookName} ${ref.chapter}${ref.bookId === PSALMS_BOOK_ID ? "편" : "장"}`;
}

// bookmarkedIds는 회원별 데이터라 호출자가 요청 단위로 넘긴다 (카탈로그 캐시에 섞지 않는다).
export async function searchVerses(
  filters: SearchFilters,
  offset = 0,
  bookmarkedIds: string[] = [],
): Promise<SearchPage<VerseResult>> {
  const books = filters.q ? await getBibleBooks() : [];
  const ref = filters.q ? parseReference(filters.q, books) : null;
  // 참조로 해석되면 패널의 성경 분류를 대체한다 — 교집합이면 "창세기 선택 + 시편 23 입력"이 0건이 된다.
  const bookIds = ref ? [ref.bookId] : await resolveBookIds(filters);
  const chapter = ref ? ref.chapter : filters.chapter;
  const shuffle = !filters.q && !filters.book && !filters.chapter;

  const { data, error } = await supabaseAdmin.rpc("search_verses", {
    p_q: ref ? null : filters.q || null,
    p_book_ids: bookIds,
    p_chapter: chapter ?? null,
    p_verse: ref?.verse ?? null,
    p_theme_ids: tagsOrNull(filters.theme),
    p_situation_ids: tagsOrNull(filters.situation),
    p_only_ids: onlyIds(filters, bookmarkedIds),
    ...excludeIds(filters, bookmarkedIds),
    p_seed: shuffle ? (filters.seed ?? null) : null,
    p_limit: filters.limit,
    p_offset: offset,
    p_match_any: filters.matchAny,
  });
  if (error) throw error;

  const rows = (data ?? []) as (VerseResult & { total: number | string })[];
  const bookName = ref && books.find((book) => book.id === ref.bookId)?.name;
  return {
    items: rows.map(({ id, reference, body, translation, meaning, application }) => ({
      id,
      reference,
      body,
      translation,
      meaning,
      application,
    })),
    total: totalOf(rows, offset),
    ...(ref && bookName ? { matchedReference: describeReference(ref, bookName) } : {}),
  };
}

export async function searchSongs(
  filters: SearchFilters,
  offset = 0,
  bookmarkedIds: string[] = [],
): Promise<SearchPage<SongResult>> {
  const { data, error } = await supabaseAdmin.rpc("search_songs", {
    p_q: filters.q || null,
    p_theme_ids: tagsOrNull(filters.theme),
    p_situation_ids: tagsOrNull(filters.situation),
    p_mood_ids: tagsOrNull(filters.mood),
    p_only_ids: onlyIds(filters, bookmarkedIds),
    ...excludeIds(filters, bookmarkedIds),
    p_seed: filters.q ? null : (filters.seed ?? null),
    p_limit: filters.limit,
    p_offset: offset,
    p_match_any: filters.matchAny,
  });
  if (error) throw error;

  const rows = (data ?? []) as {
    id: string;
    title: string;
    artist: string;
    listen_url: string | null;
    summary: string | null;
    total: number | string;
  }[];
  return {
    items: rows.map((row) => ({
      id: row.id,
      title: row.title,
      artist: row.artist,
      listenUrl: row.listen_url,
      summary: row.summary,
    })),
    total: totalOf(rows, offset),
  };
}

export type { RelaxSuggestion };

// 결과가 0개일 때만 부른다. 도움말은 부가 기능이라, 조회가 실패한 후보는 버리고 0개 안내는 그대로 보여준다.
export async function findRelaxations(filters: SearchFilters, bookmarkedIds: string[]): Promise<RelaxSuggestion[]> {
  const search = filters.type === "verse" ? searchVerses : searchSongs;
  const settled = await Promise.allSettled(
    relaxationCandidates(filters).map(async (candidate) => {
      const page = await search({ ...candidate.filters, limit: 1 }, 0, bookmarkedIds);
      return { label: candidate.label, href: buildSearchHref({ ...candidate.filters, limit: undefined }), count: page.total };
    }),
  );
  return pickSuggestions(settled.flatMap((result) => (result.status === "fulfilled" ? [result.value] : [])));
}
