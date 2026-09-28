import "server-only";
import { callOllamaChat, type ChatMessage } from "@/shared/lib/ollama-client";
import type { AnalysisResult } from "@/lib/analysis/types";
import type { VerseResult, SongResult } from "@/lib/recommend/types";

const SYSTEM_PROMPT = `너는 "곁에" 서비스에서 사용자와 나눈 대화를 바탕으로, 추천 결과 화면에 보여줄 짧은 글을 쓰는 AI다. 존댓말로 1~2문장만 써라. 설명, 인사말, 따옴표 등 글 본문 이외의 어떤 텍스트도 붙이지 마라.

이 글은 두 가지를 담아야 한다:
1. 대화에서 나온 사용자의 상황이나 감정을 한 조각이라도 구체적으로 짚어서 돌려준다
2. 그 상황과 지금 추천하는 말씀·찬양이 어떻게 이어지는지 짧게 설명한다

--- 나쁜 예: 이렇게 쓰면 안 된다 ---
입력: 말씀 = "마태복음 11:28 — 수고하고 무거운 짐 진 자들아 다 내게로 오라 내가 너희를 쉬게 하리라"
출력: "오늘의 힘든 업무로 많이 지치셨군요. \"수고하고 무거운 짐 진 자들아 다 내게로 오라 내가 너희를 쉬게 하리라\"는 말씀처럼, 잠시나마 안식을 느껴보시길 권합니다."
문제: 말씀 구절을 그대로 따옴표로 인용했다. 이 구절은 바로 아래 말씀 카드에 이미 그대로 보이므로, 여기서 또 인용하면 같은 문장을 두 번 읽게 된다.
고치면: "오늘 업무로 많이 지치셨군요. 잠시 짐을 내려놓고 쉬어가도 괜찮은 시간이 되셨으면 해요."

규칙:
- 대화에서 실제로 나오지 않은 감정이나 상황을 단정하지 않는다
- 조언하거나 해결책을 제시하지 않는다 — 알아주고 짚어주는 역할까지만 한다
- **이 글 안에서 성경 구절 문장을 단 한 글자도 그대로 옮겨 쓰지 않는다.** 따옴표로 인용하는 것도, 따옴표 없이 그대로 풀어 쓰는 것도 안 된다 — 말씀은 별도 카드로 이미 보여준다. "안식", "위로", "감사"처럼 구절이 담은 주제를 내 표현으로만 언급한다.
- 가볍고 따뜻하게 쓴다 — 무겁게 끌고 가지 않는다
- 판단하거나 가르치지 않는다`;

const MAX_LENGTH = 220;
const MIN_QUOTE_CHECK_LENGTH = 8;

function sanitize(raw: string): string {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/^```(?:\w*)?\s*([\s\S]*?)\s*```$/);
  const unfenced = fenced ? fenced[1].trim() : trimmed;
  return unfenced.replace(/^["'“]+|["'”]+$/g, "").trim();
}

// 모델이 규칙을 어기고 말씀 구절을 그대로 옮겨 쓰는 경우를 대비한 방어선 —
// 공백을 무시하고 verse.body의 8자 이상 연속 구간이 결과 글에 그대로
// 나타나면 인용으로 간주한다.
function containsVerseQuote(text: string, verseBody: string): boolean {
  const normalize = (value: string) => value.replace(/\s+/g, "");
  const normText = normalize(text);
  const normVerse = normalize(verseBody);
  for (let start = 0; start + MIN_QUOTE_CHECK_LENGTH <= normVerse.length; start++) {
    const chunk = normVerse.slice(start, start + MIN_QUOTE_CHECK_LENGTH);
    if (normText.includes(chunk)) return true;
  }
  return false;
}

interface GenerateResultLineParams {
  analysis: AnalysisResult;
  verse: VerseResult | null;
  song: SongResult | null;
}

async function generateOnce(params: GenerateResultLineParams): Promise<string> {
  const { analysis, verse, song } = params;

  const lines = [
    `지금까지 나눈 대화 요약: ${analysis.summary || "(짧은 대화라 요약할 내용이 적음)"}`,
    `추천 방향: ${analysis.direction}`,
    `추천 이유(내부 메모, 그대로 인용하지 말고 참고만 할 것): ${analysis.reason}`,
  ];
  if (analysis.efforts.length > 0) {
    lines.push(`사용자가 그동안 애써온 부분: ${analysis.efforts.join(", ")}`);
  }
  lines.push(
    `이번에 추천하는 말씀(이 문장을 그대로 옮겨 쓰지 말 것): ${verse ? `${verse.reference} — ${verse.body}` : "없음"}`,
    `이번에 추천하는 찬양: ${song ? `${song.title} (아티스트: ${song.artist})` : "없음"}`,
    "",
    "위 내용을 바탕으로 결과 화면에 보여줄 짧은 글을 써줘.",
  );

  const messages: ChatMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: lines.join("\n") },
  ];

  const raw = await callOllamaChat(messages);
  const text = sanitize(raw);

  if (!text || text.length > MAX_LENGTH) {
    throw new Error(`결과 글 응답이 비어있거나 너무 깁니다 (${text.length}자): ${text}`);
  }
  if (verse && containsVerseQuote(text, verse.body)) {
    throw new Error(`결과 글이 말씀 구절을 그대로 인용했습니다: ${text}`);
  }

  return text;
}

/**
 * F-07 "짧은 응원의 글" 본체. F-06 분석 결과(summary/reason/efforts)와
 * 실제로 선택된 말씀·찬양을 재료로, 대화 내용을 구체적으로 짚어주면서
 * 왜 이 말씀·찬양을 추천하는지까지 담은 1~2문장을 생성한다.
 * 빈 응답·과도한 길이·말씀 구절 그대로 인용은 로컬 모델의 간헐적 실수인
 * 경우가 많아 1회만 재시도하고, 그래도 실패하거나 네트워크 자체가 죽었으면
 * 그대로 던진다 — 폴백 처리는 호출부(app/api/recommend)의 몫이다.
 */
export async function generateResultLine(params: GenerateResultLineParams): Promise<string> {
  try {
    return await generateOnce(params);
  } catch {
    return await generateOnce(params);
  }
}
