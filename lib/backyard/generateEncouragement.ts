import "server-only";
import { callAiChat, type ChatMessage } from "@/shared/lib/ai-client";
import { containsVerseQuote, sanitizeGeneratedText } from "@/lib/church/generateResultLine";
import type { AnalysisResult } from "@/lib/analysis/types";
import type { VerseResult, SongResult } from "@/lib/recommend/types";

const SYSTEM_PROMPT = `너는 "곁에" 서비스의 뒤뜰에서, 사용자가 혼자 길게 털어놓은 글을 읽고 추천 결과 화면 맨 위에 보여줄 응원의 글을 쓰는 AI다. 따뜻한 존댓말로 정확히 4문장을 써라. 설명, 인사말, 제목, 따옴표, 목록 기호 등 글 본문 이외의 어떤 텍스트도 붙이지 마라.

이 글은 아래 세 가지를 모두 담아야 한다:
1. 인정 — 그 감정을 느끼는 게 당연하다고 알아주는 말
2. 노력 — 그동안 애써온 것을 짚어주는 말 (주어진 "애써온 부분"을 활용)
3. 격려 — 지금 상황에서 힘이 되는 말

--- 나쁜 예 ---
"많이 힘드셨겠어요. 힘든 시간도 결국 지나갈 거예요. 기도하면서 이겨내 보세요."
문제: 사용자가 쓴 구체적인 내용이 하나도 없는 일반론이고, "기도하면서 이겨내 보세요"는 조언이다. "결국 지나갈 거예요"는 약속·예언형 표현이다.

--- 좋은 예 ---
"몇 주째 회사 일에 매달리면서도 주변에 티 내지 않으려 애쓰셨군요. 그렇게 버텨왔으니 지금 지치는 게 너무 당연해요. 스스로를 몰아세운 만큼 오늘은 조금 느슨해져도 괜찮아요."

규칙:
- 사용자가 쓴 글의 구체적인 내용(상황, 사람, 일)을 최소 한 번은 언급한다. 일반론은 의미가 없다
- 사용자가 글에서 말하지 않은 감정·상황·원인을 단정하지 않는다
- 해결책을 제시하거나 조언하지 않는다 — 들어주고 알아주는 역할까지만
- "~해보세요", "~하시길 바랍니다", "~를 통해 힘을 얻으세요"처럼 무엇을 하라고 권하는 문장을 쓰지 않는다
- "다 잘될 거예요", "잘 헤쳐나갈 수 있을 거예요", "약속해요"처럼 결과를 약속하거나 예언하는 표현을 쓰지 않는다
- **성경 구절 문장을 이 글 안에서 단 한 글자도 그대로 옮겨 쓰지 않는다.** 말씀과 찬양은 아래 카드로 따로 보여주므로, 이 글에서는 찬양 제목·말씀 출처(예: "이사야의 말씀처럼")를 아예 언급하지 않는다
- 판단하거나 가르치지 않는다
- 처음부터 끝까지 존댓말만 쓴다. 사용자를 "너", "네"로 부르지 않는다`;

const MIN_SENTENCES = 3;
const MAX_SENTENCES = 5;
const MAX_LENGTH = 450;
const MAX_INPUT_LENGTH = 1000;

// 프롬프트로 금지해도 로컬 모델이 자주 섞는 조언형·예언형 문장 — 해당 문장만 뺀다.
const FORBIDDEN_SENTENCE_PATTERNS: readonly RegExp[] = [
  /보세요/,
  /어떨까요/,
  /바랍니다/,
  /나아가세요/,
  /잊지\s*마세요/,
  // "자연스러운 거예요" 같은 인정 문장은 걸리지 않도록 ㄹ 미래형만 잡는다.
  /[을될올갈날질할]\s*(거|것)(예요|에요|이에요|입니다)/,
];

function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?。])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 0);
}

interface GenerateEncouragementParams {
  text: string;
  analysis: AnalysisResult;
  verse: VerseResult | null;
  song: SongResult | null;
}

async function generateOnce(params: GenerateEncouragementParams): Promise<string> {
  const { text, analysis, verse, song } = params;

  const lines = [
    "사용자가 뒤뜰에 쓴 글:",
    text.slice(0, MAX_INPUT_LENGTH),
    "",
    `글 요약: ${analysis.summary}`,
    `추천 방향: ${analysis.direction}`,
  ];
  if (analysis.efforts.length > 0) {
    lines.push(`사용자가 그동안 애써온 부분: ${analysis.efforts.join(", ")}`);
  }
  lines.push(
    `이번에 추천하는 말씀(이 문장을 그대로 옮겨 쓰지 말 것): ${verse ? `${verse.reference} — ${verse.body}` : "없음"}`,
    `이번에 추천하는 찬양(제목을 글에 쓰지 말 것): ${song ? `${song.title} (아티스트: ${song.artist})` : "없음"}`,
    "",
    "위 내용을 바탕으로 응원의 글을 써줘.",
  );

  const messages: ChatMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: lines.join("\n") },
  ];

  const raw = sanitizeGeneratedText(await callAiChat(messages)).replace(/\s+/g, " ");
  const sentences = splitSentences(raw).filter(
    (sentence) => !FORBIDDEN_SENTENCE_PATTERNS.some((pattern) => pattern.test(sentence)),
  );
  const result = sentences.join(" ");

  if (sentences.length < MIN_SENTENCES || sentences.length > MAX_SENTENCES || result.length > MAX_LENGTH) {
    throw new Error(
      `응원의 글 분량이 범위를 벗어났습니다 (금지 문장 제외 후 ${sentences.length}문장, ${result.length}자): ${raw}`,
    );
  }
  if (verse && containsVerseQuote(result, verse.body)) {
    throw new Error(`응원의 글이 말씀 구절을 그대로 인용했습니다: ${result}`);
  }

  return result;
}

/**
 * F-04 긴 응원의 글. 형식 위반은 1회만 재시도하고 그래도 실패하면 던진다.
 */
export async function generateEncouragement(params: GenerateEncouragementParams): Promise<string> {
  try {
    return await generateOnce(params);
  } catch {
    return await generateOnce(params);
  }
}
