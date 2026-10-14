import { PSALMS_BOOK_ID } from "@/lib/search/parseReference";
import type { SearchFilters } from "@/lib/search/searchQuery";

export interface RelaxCandidate {
  label: string;
  filters: SearchFilters;
}

// 결과가 0개일 때 "이 조건을 빼면 몇 개 있어요"를 보여줄 후보들 — 실제 개수는 서버가 각각 조회한다.
export function relaxationCandidates(filters: SearchFilters): RelaxCandidate[] {
  const candidates: RelaxCandidate[] = [];
  const add = (label: string, next: Partial<SearchFilters>) => candidates.push({ label, filters: { ...filters, ...next } });

  if (filters.q) add("검색어 없이", { q: "" });
  if (filters.bookmarked) add("북마크 밖에서도", { bookmarked: false });
  if (filters.chapter) add(filters.book === PSALMS_BOOK_ID ? "편 선택 없이" : "장 선택 없이", { chapter: undefined });
  else if (filters.book) add("책 선택 없이", { book: undefined });
  else if (filters.category) add("분류 선택 없이", { category: undefined });
  else if (filters.testament) add("구약·신약 구분 없이", { testament: undefined });
  if (filters.theme.length > 0) add("주제 없이", { theme: [] });
  if (filters.situation.length > 0) add("상황 없이", { situation: [] });
  if (filters.mood.length > 0) add("분위기 없이", { mood: [] });

  const tagCount = filters.theme.length + filters.situation.length + filters.mood.length;
  if (!filters.matchAny && tagCount >= 2) add("하나라도 맞는 것", { matchAny: true });
  return candidates;
}

export interface RelaxSuggestion {
  label: string;
  href: string;
  count: number;
}

const MAX_SUGGESTIONS = 3;

export function pickSuggestions(counted: RelaxSuggestion[]): RelaxSuggestion[] {
  return counted
    .filter((suggestion) => suggestion.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, MAX_SUGGESTIONS);
}
