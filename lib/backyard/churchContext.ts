import type { ChurchTurn } from "@/lib/counsel/transcript";

// 교회 대화는 같은 탭에서 뒤뜰로 넘어갈 때만 이어지면 되므로 sessionStorage에 둔다.
const CHURCH_CONTEXT_KEY = "gyeote:churchContext";

export interface ChurchContext {
  transcript: string;
  turns: ChurchTurn[];
  clientRequestId: string | null;
}

const EMPTY_CONTEXT: ChurchContext = { transcript: "", turns: [], clientRequestId: null };

export function saveChurchContext(context: ChurchContext): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(CHURCH_CONTEXT_KEY, JSON.stringify(context));
  } catch {
    // storage unavailable — 맥락 없이 뒤뜰을 새로 시작한다
  }
}

// 한 번 꺼내면 지운다 — 나중에 시작 화면에서 뒤뜰로 들어왔을 때 옛 대화가 붙지 않게.
export function takeChurchContext(): ChurchContext {
  if (typeof window === "undefined") return EMPTY_CONTEXT;
  try {
    const raw = window.sessionStorage.getItem(CHURCH_CONTEXT_KEY);
    window.sessionStorage.removeItem(CHURCH_CONTEXT_KEY);
    if (!raw) return EMPTY_CONTEXT;
    const parsed = JSON.parse(raw) as Partial<ChurchContext>;
    return {
      transcript: typeof parsed.transcript === "string" ? parsed.transcript : "",
      turns: Array.isArray(parsed.turns) ? parsed.turns : [],
      clientRequestId: typeof parsed.clientRequestId === "string" ? parsed.clientRequestId : null,
    };
  } catch {
    return EMPTY_CONTEXT;
  }
}

export function combineWithChurchContext(churchTranscript: string, backyardText: string): string {
  if (!churchTranscript) return backyardText;
  return `[교회에서 나눈 대화]\n${churchTranscript}\n\n[이어서 뒤뜰에 쓴 글]\n${backyardText || "(추가로 쓴 글 없음)"}`;
}
