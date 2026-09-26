import type { RecommendationRecord } from "./types";

const RECENT_RECOMMENDATIONS_KEY = "gyeote:recentRecommendations";
const MAX_ENTRIES = 30;

/**
 * F-08 규칙: 최근 추천 기록을 기기 로컬에 최대 30개까지 저장한다.
 * 서버는 이 기록을 받아 "최근 7일 안에 추천한 곡·말씀"을 제외하는 데 쓴다.
 */
export function getRecommendationHistory(): RecommendationRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(RECENT_RECOMMENDATIONS_KEY);
    return raw ? (JSON.parse(raw) as RecommendationRecord[]) : [];
  } catch {
    return [];
  }
}

export function recordRecommendation(entry: RecommendationRecord): void {
  if (typeof window === "undefined") return;
  try {
    const next = [entry, ...getRecommendationHistory()].slice(0, MAX_ENTRIES);
    window.localStorage.setItem(RECENT_RECOMMENDATIONS_KEY, JSON.stringify(next));
  } catch {
    // storage unavailable — recency exclusion degrades gracefully server-side
  }
}
