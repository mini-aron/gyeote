// 교회 대화는 같은 탭에서 뒤뜰로 넘어갈 때만 이어지면 되므로 sessionStorage에 둔다.
const CHURCH_CONTEXT_KEY = "gyeote:churchContext";

export function saveChurchContext(transcript: string): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(CHURCH_CONTEXT_KEY, transcript);
  } catch {
    // storage unavailable — 맥락 없이 뒤뜰을 새로 시작한다
  }
}

// 한 번 꺼내면 지운다 — 나중에 시작 화면에서 뒤뜰로 들어왔을 때 옛 대화가 붙지 않게.
export function takeChurchContext(): string {
  if (typeof window === "undefined") return "";
  try {
    const transcript = window.sessionStorage.getItem(CHURCH_CONTEXT_KEY) ?? "";
    window.sessionStorage.removeItem(CHURCH_CONTEXT_KEY);
    return transcript;
  } catch {
    return "";
  }
}

export function combineWithChurchContext(churchTranscript: string, backyardText: string): string {
  if (!churchTranscript) return backyardText;
  return `[교회에서 나눈 대화]\n${churchTranscript}\n\n[이어서 뒤뜰에 쓴 글]\n${backyardText || "(추가로 쓴 글 없음)"}`;
}
