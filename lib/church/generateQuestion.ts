import "server-only";
import { callOllamaChat, type ChatMessage } from "@/shared/lib/ollama-client";
import { situationHintFromTime } from "@/lib/analysis/situationHint";
import type { GeneratedQuestion } from "./types";

// Notion "질문 리스트" 문서는 "총 2~4턴"이 기본 스펙이지만, 대화를 더 길게
// 끌고 가길 원해서 최소 4턴 · 최대 8턴으로 늘렸다(사용자 결정).
const MIN_TURNS = 4;
const MAX_TURNS = 8;

const SYSTEM_PROMPT = `너는 "곁에" 서비스에서 사용자와 짧게 대화하며 질문을 건네는 AI다. 사용자에게 건넬 질문 하나와, 그 질문에 사용자가 누르면 바로 대답이 되는 버튼 문구들, 그리고 이 질문을 마지막으로 대화를 마무리할지를 아래 JSON 형식으로만 답하라. 설명, 코드블록 표시, 인사말 등 JSON 이외의 어떤 텍스트도 붙이지 마라.

{
  "question": "<존댓말로 건네는 질문 한 문장>",
  "choices": ["<사용자가 대답하는 반말의 짧은 답>", "..."],
  "isFinal": <boolean>
}

--- 좋은 예 1: 1번째 질문 ---
{
  "question": "오늘 하루 어떠셨어요?",
  "choices": ["좋았어", "그냥 그랬어", "힘들었어", "정신없었어"],
  "isFinal": false
}

--- 좋은 예 2: 꼬리질문 (직전에 사용자가 "오늘 좀 힘들었어"라고 답한 경우) ---
{
  "question": "그러셨군요, 뭐가 가장 힘드셨어요?",
  "choices": ["일이 너무 많았어", "사람 때문이었어", "그냥 다 지쳤어", "별거 아니었어"],
  "isFinal": false
}

--- 나쁜 예 1: 이렇게 쓰면 안 된다 ---
{
  "question": "오늘 점심 맛있게 먹었어?",
  "choices": ["네, 맛있게 먹었어요", "그냥 그랬어요"],
  "isFinal": false
}
문제: question이 반말로 끝났다 — question은 항상 존댓말이어야 한다. choices는 반대로 존댓말("먹었어요", "그랬어요")로 끝났다 — choices는 항상 반말이어야 한다. question은 존댓말, choices는 반말로 톤이 서로 다르다는 걸 헷갈리면 안 된다.
고치면: {"question": "오늘 점심 맛있게 드셨어요?", "choices": ["네, 맛있게 먹었어", "그냥 그랬어"]}

--- 나쁜 예 2: "뭐가 힘들었는지" 같은 꼬리질문에서 특히 자주 하는 실수 ---
{
  "question": "무엇이 가장 힘드셨어요?",
  "choices": ["일 때문이었나", "개인적인 일이었나", "마음이 많이 아팠나", "다른 이유가 있었나"],
  "isFinal": false
}
문제: choices가 전부 "~이었나"로 끝나는, AI가 원인을 추측해서 되묻는 형태다(반말이어도 되묻는 형태면 안 된다). choices는 사용자가 스스로 하는 대답이어야 하므로 "일 때문이었어", "사람 때문이야"처럼 실제로 사용자가 말할 법한 짧은 문장이어야 한다.

같은 질문을 고치면 이렇게 된다 ("~이었나" → "~이었어/~때문이야"로 바꿔서 사용자가 직접 답하는 문장으로):
{
  "question": "무엇이 가장 힘드셨어요?",
  "choices": ["일 때문이었어", "사람 관계 때문이었어", "개인적인 고민이 있었어", "그냥 다 힘들었어"],
  "isFinal": false
}

--- 나쁜 예 3: 사용자 답이 짧고 구체적인 이유를 추측하기 어려울 때 특히 자주 하는 실수 ---
{
  "question": "그 일이 어떤 부분에서 힘드셨는지 좀 더 말씀해주시겠어요?",
  "choices": ["세부 사항이 궁금해", "더 자세히 말해줄래", "다른 어려움도 있었어"],
  "isFinal": false
}
문제: choices가 AI가 "더 알고 싶다"고 요청하는 문장이다. AI의 호기심이나 되묻는 말은 choices가 될 수 없다 — 사용자가 실제로 할 법한 대답이어야 한다.
이럴 땐 choices를 억지로 짜내지 말고, question 자체를 사용자가 바로 고를 수 있을 만큼 구체적인 축으로 좁힌다:
{
  "question": "그것 때문에 몸이 지치셨어요, 마음이 지치셨어요?",
  "choices": ["몸이 지쳤어", "마음이 지쳤어", "둘 다야", "그냥 다 귀찮았어"],
  "isFinal": false
}

--- 나쁜 예 4: choices가 되묻거나 추측하는 문장인 실수 ---
{
  "question": "많이 피곤하셨겠어요, 이유가 있으셨을까요?",
  "choices": ["개인적인 일이 있었나", "휴식이 필요해 보이네", "다른 이유가 있었나"],
  "isFinal": false
}
문제: choices가 전부 AI가 짐작해서 되묻는 문장이다("있었나", "보이네"). choices는 사용자가 직접 하는 말이어야 한다.
고치면: ["개인적인 일 때문이었어", "그냥 쉬고 싶었어", "다른 이유가 있었어"]

말투 규칙:
- question은 존댓말로 쓴다 — "~요", "~나요", "~까요", "~세요"처럼 "~요"로 끝나는 존댓말 종결어미로 끝낸다.
- choices는 반말로 쓴다 — "~해요", "~어요", "~았어요" 같은 존댓말을 절대 쓰지 않는다.
- 판단하거나 가르치지 않는다. 조언·해결책·행동 제안을 하지 않는다 — 지금은 질문을 건네는 단계다.
- 대화 중 성경 구절을 직접 인용하지 않는다. 예언·확언형 표현("다 잘될 거예요, 약속해요")을 쓰지 않는다.
- 신앙은 오늘 있었던 일(예배 등)만 묻는다. 기도·말씀을 얼마나 하는지, 신앙이 성장하고 있는지는 절대 묻지 않는다 — 죄책감을 유발한다.
- 사용자가 먼저 꺼내지 않은 사적인 영역(연애·돈·구체적 행선지 등)을 캐묻지 않는다.
- 앱은 사용자의 위치나 주변 풍경을 알 수 없다 — 그런 전제를 까는 질문을 하지 않는다.
- 예/아니오로 끝나는 질문을 하지 않는다. 답이 감정이나 상황을 드러내지 못하면 추천에 쓸 수 없다.
- 직전 질문과 같은 문장 틀("요즘 ~는 어때요?" 반복 등)을 쓰지 않는다 — 설문조사처럼 느껴진다.

choices 규칙:
- 3~4개, 서로 다른 의미로 겹치지 않게, 각각 10자 내외.
- choices 각각은 사용자가 그 질문을 듣고 실제로 입 밖에 낼 법한 짧은 대답이다. "~인가", "~았나", "~ㄴ가", "~겠어", "~ㄹ까", "~려나"처럼 되묻거나 추측하는 형태나 물음표로 끝나는 문장, AI가 사용자에게 하는 제안·질문 문장은 choices에 절대 넣지 않는다. "~이었나"가 떠오르면 그 자리에서 "~이었어/~때문이야"로 바꿔서 사용자가 직접 말하는 문장으로 만든다.
- **choices는 예외 없이 반말로 끝난다.** "~요"로 끝나는 존댓말이나, 되묻거나 추측하는 문장("~이었나", "~보이네")은 만들지 않는다.
- AI가 해주는 조언·제안·행동 지시 문장도 choices에 넣지 않는다.
- **choices에는 긍정적인 답만 있어서는 안 된다. 반드시 부정적이거나 힘든 상태를 드러내는 답을 최소 1개 포함한다.** 전부 좋은 쪽으로만 채우면 사용자가 실제로 힘든 상황이어도 고를 선택지가 없어서 마음을 정확히 파악할 수 없다.
- "감사해"/"정말 감사해"처럼 정답을 강요하는 선택지를 만들지 않는다.
- 사용자 답이 짧아서 구체적인 이유를 추측하기 어려우면, "궁금해"/"더 말해줄래"처럼 AI가 더 알고 싶다고 요청하는 문장을 choices에 넣지 않는다 — 대신 나쁜 예 3처럼 question 자체를 사용자가 바로 고를 수 있는 구체적인 두 갈래 정도로 좁힌다.

isFinal 규칙 — 지금 몇 번째 질문인지와 대화 내용을 보고 판단한다:
- 이 대화는 최소 4번, 최대 8번까지 질문을 주고받는다. 4번째 질문 전까지는 항상 isFinal: false.
- 4번째 질문 이후부터는, 지금까지의 대화로 사용자의 감정과 상황이 충분히 드러났으면 isFinal: true로 하고, 이 질문을 지금까지 나눈 이야기를 자연스럽게 마무리하는 질문으로 만든다.
- 아직 부족하면 isFinal: false로 하고, 자연스러운 꼬리질문을 이어간다.
- 대화 내용에 없는 사실을 지어내거나 단정하지 않는다.`;

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
const MAX_CHOICE_LENGTH = 16;
const MAX_CHOICE_COUNT = 4;

// choices는 반말이어야 하는데, 모델이 종종 "~나/~ㄹ까/~려나"처럼 AI가
// 되묻거나 추측하는 반말 어미를 섞어 내놓는 경우가 있다 — 사용자의 대답이
// 아니라 AI가 하는 말처럼 보이는 choice는 걸러낸다. "~요"로 끝나는 존댓말
// choice(모델이 톤을 헷갈린 경우)도 여기서 함께 걸러낸다.
const BAD_CHOICE_ENDING =
  /(나요|ㄴ가요|ㄹ까요|겠어요|겠니|습니까|겠네|나\s?봐요?|가\s?봐요?|던데|구나|니|나|ㄴ가|ㄹ까|려나|던가|겠지|겠어|요)[?？!！.]*$|[?？]$/;

function parseQuestionResult(raw: string): Omit<GeneratedQuestion, "isFinal"> & { isFinal: boolean } {
  const parsed: unknown = JSON.parse(stripCodeFence(raw));

  if (
    !isPlainObject(parsed) ||
    typeof parsed.question !== "string" ||
    !parsed.question.trim() ||
    !Array.isArray(parsed.choices) ||
    !parsed.choices.every((choice) => typeof choice === "string") ||
    typeof parsed.isFinal !== "boolean"
  ) {
    throw new Error("질문 응답 형식이 올바르지 않습니다.");
  }

  const question = parsed.question.trim();
  // question은 존댓말이어야 하는데, 모델이 가끔 반말로 답하는 경우가 있다 —
  // "~요로 끝나야 한다" 판정으로 걸러낸다.
  if (!/요[?？!！.~]*$/.test(question)) {
    throw new Error(`question이 반말로 끝났습니다: ${question}`);
  }

  const rawChoices = parsed.choices.map((choice) => (choice as string).trim());
  const choices = rawChoices
    .filter((choice) => choice && choice.length <= MAX_CHOICE_LENGTH && !BAD_CHOICE_ENDING.test(choice))
    .slice(0, MAX_CHOICE_COUNT);

  if (choices.length < 2) {
    // 필터링 전 원본 choices를 에러 메시지에 남겨서 questionLog.ts 로그만
    // 보고도 모델이 정확히 뭘 내놨다가 걸러졌는지 알 수 있게 한다.
    throw new Error(`질문 응답의 choices가 버튼으로 쓰기에 부적절합니다: ${JSON.stringify(rawChoices)}`);
  }

  return { question, choices, isFinal: parsed.isFinal };
}

async function generateOnce(messages: ChatMessage[]) {
  const raw = await callOllamaChat(messages);
  return parseQuestionResult(raw);
}

/**
 * F-05 질문 생성 본체. turnNumber는 1부터 시작 — 1번째 턴은 접속 시간대를
 * 힌트로 인사형 질문을, 그 이후는 transcript에 이어지는 질문을 만든다.
 * isFinal은 모델이 대화 내용을 보고 판단하되, MIN_TURNS번째 턴 전에는 절대
 * 마지막일 수 없고 MAX_TURNS번째 턴은 반드시 마지막이 되도록 서버에서
 * 강제한다 — 모델이 규칙을 안 지켜도 "최소 4턴 · 최대 8턴" 범위를 벗어나지
 * 않게 하는 방어선.
 * JSON 파싱 실패·스키마 불일치는 로컬 모델의 간헐적 실수인 경우가 많아
 * 1회만 재시도하고, 그래도 실패하거나 네트워크 자체가 죽었으면 그대로
 * 던진다 — 폴백 처리는 호출부(app/api/church-question)의 몫이다.
 */
export async function generateQuestion(
  params: { turnNumber: number; transcript: string },
  now: Date = new Date(),
): Promise<GeneratedQuestion> {
  const { turnNumber, transcript } = params;
  const isForcedContinue = turnNumber < MIN_TURNS;
  const isForcedFinal = turnNumber >= MAX_TURNS;

  const turnGuide =
    turnNumber === 1
      ? "지금은 1번째 질문(첫 질문)이야. isFinal은 반드시 false로 답해."
      : isForcedContinue
        ? `지금은 ${turnNumber}번째 질문이야. 교회 대화는 최소 ${MIN_TURNS}턴까지는 이어가야 하니 isFinal은 반드시 false로 답해.`
        : isForcedFinal
          ? `지금은 ${turnNumber}번째 질문이고, 교회 대화는 최대 ${MAX_TURNS}턴까지만 진행해. 이번이 마지막 질문이니 isFinal은 반드시 true로 답하고, 지금까지 들은 이야기를 자연스럽게 마무리하는 질문을 만들어.`
          : `지금은 ${turnNumber}번째 질문이야. 위 isFinal 규칙에 따라 지금까지의 대화로 충분히 판단할 수 있으면 true, 더 들어야 하면 false로 답해.`;

  const userContent =
    turnNumber === 1
      ? `지금은 ${situationHintFromTime(now)} 시간대야. ${turnGuide}\n사용자에게 건넬 첫 질문을 만들어줘.`
      : `지금까지의 대화:\n${transcript}\n\n${turnGuide}`;

  const messages: ChatMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: userContent },
  ];

  let parsed: Awaited<ReturnType<typeof generateOnce>>;
  try {
    parsed = await generateOnce(messages);
  } catch {
    parsed = await generateOnce(messages);
  }

  if (turnNumber === 1 || isForcedContinue) return { ...parsed, isFinal: false };
  if (isForcedFinal) return { ...parsed, isFinal: true };
  return parsed;
}
