import "server-only";
import { callOllamaChat } from "@/shared/lib/ollama-client";
import { situationHintFromTime } from "@/lib/analysis/situationHint";
import type { FallbackQuestion } from "./fallbackQuestions";

const SYSTEM_PROMPT = `너는 "곁에" 서비스에서 예수님 역할로 사용자와 짧게 대화하는 챗봇이다. 사용자에게 건넬 질문 하나와, 그 질문에 사용자가 누르면 바로 대답이 되는 버튼 문구들을 아래 JSON 형식으로만 답하라. 설명, 코드블록 표시, 인사말 등 JSON 이외의 어떤 텍스트도 붙이지 마라.

{
  "question": "<따뜻하고 다정한 말투의 질문 한 문장>",
  "choices": ["<사용자 입장에서 짧게 대답하는 말, 8자 이내>", "..."]
}

예시:
{
  "question": "오늘 하루 어땠어?",
  "choices": ["좋았어요", "그냥 그랬어요", "힘들었어요", "정신없었어요"]
}

규칙:
- choices는 3~4개, 서로 다른 의미로 겹치지 않게.
- choices는 반드시 사용자가 자기 상태·감정을 짧게 말하는 대답이다 — 예수님이 사용자에게 해주는 조언·제안·행동 지시 문장을 choices에 넣지 않는다.
- choices 각각은 8자를 넘지 않는다. 문장이 아니라 단어·짧은 구 형태로.
- 대화 내용에 없는 사실을 지어내거나 단정하지 않는다.
- 조언하거나 해결책을 제시하지 않는다 — 지금은 질문을 건네는 단계다.`;

function stripCodeFence(text: string): string {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenced ? fenced[1].trim() : trimmed;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

// 모델이 규칙을 어기고 긴 문장을 choice로 내놓는 경우를 대비한 방어선 —
// 버튼 UI가 감당할 수 있는 길이를 넘는 choice는 걸러낸다.
const MAX_CHOICE_LENGTH = 12;
const MAX_CHOICE_COUNT = 4;

function parseQuestionResult(raw: string): FallbackQuestion {
  const parsed: unknown = JSON.parse(stripCodeFence(raw));

  if (
    !isPlainObject(parsed) ||
    typeof parsed.question !== "string" ||
    !parsed.question.trim() ||
    !Array.isArray(parsed.choices) ||
    !parsed.choices.every((choice) => typeof choice === "string")
  ) {
    throw new Error("질문 응답 형식이 올바르지 않습니다.");
  }

  const choices = parsed.choices
    .map((choice) => (choice as string).trim())
    .filter((choice) => choice && choice.length <= MAX_CHOICE_LENGTH)
    .slice(0, MAX_CHOICE_COUNT);

  if (choices.length < 2) {
    throw new Error("질문 응답의 choices가 버튼으로 쓰기에 부적절합니다.");
  }

  return { question: parsed.question.trim(), choices };
}

/**
 * F-05 질문 생성 본체. 1번째 턴은 접속 시간대를 힌트로 인사형 질문을,
 * 2번째 턴은 지금까지의 대화(transcript)에 이어지는 마무리 질문을 만든다.
 * 실패(네트워크 오류·JSON 파싱 실패·스키마 불일치)하면 그대로 던진다 —
 * 폴백 처리는 호출부(app/api/church-question)의 몫이다.
 */
export async function generateQuestion(
  params: { turn: 1 | 2; transcript: string },
  now: Date = new Date(),
): Promise<FallbackQuestion> {
  const userContent =
    params.turn === 1
      ? `지금은 ${situationHintFromTime(now)} 시간대야. 사용자에게 건넬 첫 질문을 만들어줘.`
      : `지금까지의 대화:\n${params.transcript}\n\n이 대화에 자연스럽게 이어지는 질문을 만들어줘. 이 질문이 대화의 마지막 질문이고, 답을 들으면 바로 말씀·찬양을 추천할 거야.`;

  const raw = await callOllamaChat([
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: userContent },
  ]);

  return parseQuestionResult(raw);
}
