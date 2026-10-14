const RECENT_SEARCHES_KEY = "gyeote:recentSearches";
const MAX_RECENT = 5;

// 키워드 검색어만 담는다 — "마음으로 찾기"에 적은 글은 민감한 내용이라 기기에도 남기지 않는다.
export function readRecentSearches(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(RECENT_SEARCHES_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string").slice(0, MAX_RECENT) : [];
  } catch {
    return [];
  }
}

export function addRecentSearch(query: string): string[] {
  const next = [query, ...readRecentSearches().filter((item) => item !== query)].slice(0, MAX_RECENT);
  if (typeof window === "undefined") return next;
  try {
    window.localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next));
  } catch {
    // storage unavailable — 최근 검색어는 편의 기능이라 저장 실패를 무시한다
  }
  return next;
}

export function clearRecentSearches(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(RECENT_SEARCHES_KEY);
  } catch {
    // storage unavailable — 지울 게 없는 것과 같다
  }
}
