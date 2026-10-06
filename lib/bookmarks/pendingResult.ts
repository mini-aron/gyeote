import type { RecommendResult } from "@/lib/recommend/types";
import { isUuid } from "@/shared/lib/uuid";
import type { BookmarkKind } from "@/lib/bookmarks/types";

const PENDING_RESULT_KEY = "gyeote:pendingResult";
const MAX_AGE_MS = 30 * 60 * 1000;

export type ResultMode = "church" | "backyard";

export interface PendingResult {
  mode: ResultMode;
  verse: RecommendResult["verse"];
  song: RecommendResult["song"];
  resultLine: string;
  savedAt: number;
}

export interface ResumeBookmark {
  kind: BookmarkKind;
  id: string;
}

export function savePendingResult(snapshot: Omit<PendingResult, "savedAt">) {
  try {
    sessionStorage.setItem(PENDING_RESULT_KEY, JSON.stringify({ ...snapshot, savedAt: Date.now() }));
  } catch {
    // 저장 공간을 못 쓰면 복원만 포기하고 로그인은 그대로 진행한다
  }
}

// 읽으면서 지운다 — Strict Mode 이중 실행은 호출하는 쪽의 useRef 플래그로 막는다.
export function takePendingResult(mode: ResultMode): PendingResult | null {
  try {
    const raw = sessionStorage.getItem(PENDING_RESULT_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(PENDING_RESULT_KEY);
    const parsed = JSON.parse(raw) as Partial<PendingResult> | null;
    if (!parsed || parsed.mode !== mode) return null;
    if (typeof parsed.savedAt !== "number" || Date.now() - parsed.savedAt > MAX_AGE_MS) return null;
    if (typeof parsed.resultLine !== "string") return null;
    if (!parsed.verse && !parsed.song) return null;
    return parsed as PendingResult;
  } catch {
    return null;
  }
}

export function buildResumeParam(kind: BookmarkKind, id: string): string {
  return `bm:${kind}:${id}`;
}

export function parseResumeParam(raw: string | null): ResumeBookmark | null {
  const match = raw?.match(/^bm:(verse|song):(.+)$/);
  if (!match || !isUuid(match[2])) return null;
  return { kind: match[1] as BookmarkKind, id: match[2] };
}
