const DRAFT_KEY = "gyeote:backyardDraft";

// F-02 규칙: 쓰다 만 글은 기기에 임시 저장한다.
export function getDraft(): string {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(DRAFT_KEY) ?? "";
  } catch {
    return "";
  }
}

export function saveDraft(text: string): void {
  if (typeof window === "undefined") return;
  try {
    if (text) {
      window.localStorage.setItem(DRAFT_KEY, text);
    } else {
      window.localStorage.removeItem(DRAFT_KEY);
    }
  } catch {
    // storage unavailable — 임시 저장은 부가 기능이라 조용히 무시
  }
}

export function clearDraft(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(DRAFT_KEY);
  } catch {
    // no-op
  }
}
