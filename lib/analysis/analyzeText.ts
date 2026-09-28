import "server-only";
import { callOllamaChat } from "@/shared/lib/ollama-client";
import { THEME_OPTIONS, SITUATION_OPTIONS, MOOD_OPTIONS } from "./tagVocabulary";
import { situationHintFromTime } from "./situationHint";
import type { AnalysisResult } from "./types";

const SITUATION_LIST: readonly string[] = SITUATION_OPTIONS;
const THEME_LIST: readonly string[] = THEME_OPTIONS;
const MOOD_LIST: readonly string[] = MOOD_OPTIONS;

const SYSTEM_PROMPT = `너는 "곁에" 서비스의 대화 분석기다. 사용자와 예수님의 대화 기록을 읽고, 아래 JSON 형식으로만 답하라. 설명, 코드블록 표시, 인사말 등 JSON 이외의 어떤 텍스트도 붙이지 마라.

{
  "situation": "<상황 목록 중 정확히 하나>",
  "themes": ["<주제 목록 중 1~2개>"],
  "moods": ["<분위기 목록 중 1~2개>"],
  "direction": "<추천 방향을 한 단어로>",
  "summary": "<대화 내용을 1~2문장으로 요약>",
  "efforts": ["<사용자가 그동안 애써온 부분을 짚어주는 문장 — 재료가 없으면 빈 배열>"],
  "reason": "<이 방향으로 추천하는 이유를 한 문장으로>"
}

상황 목록: ${SITUATION_OPTIONS.join(", ")}
주제 목록: ${THEME_OPTIONS.join(", ")}
분위기 목록: ${MOOD_OPTIONS.join(", ")}

규칙:
- situation/themes/moods는 반드시 위 목록에 있는 값만 쓴다. 목록에 없는 값을 지어내지 않는다.
- situation은 대화에 분명한 단서(예: "드라이브 중이야", "위로가 필요해")가 있으면 그것을 우선하고, 단서가 없으면 사용자 메시지와 함께 주어지는 "현재 접속 시간대"를 그대로 쓴다 — 시간 정보를 지어내지 않는다.
- 대화에서 직접 말하지 않은 감정이나 상황(예: 죄책감, 회개)을 단정하지 않는다.
- 조언하거나 해결책을 제시하지 않는다 — reason과 efforts는 판단·가르침 없이 대화에서 관찰한 사실만 담는다.
- efforts는 대화가 짧아 재료가 부족하면 빈 배열로 둔다.`;

function stripCodeFence(text: string): string {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenced ? fenced[1].trim() : trimmed;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function parseAnalysisResult(raw: string): AnalysisResult {
  const parsed: unknown = JSON.parse(stripCodeFence(raw));

  if (
    !isPlainObject(parsed) ||
    typeof parsed.situation !== "string" ||
    !SITUATION_LIST.includes(parsed.situation) ||
    !isStringArray(parsed.themes) ||
    !isStringArray(parsed.moods) ||
    typeof parsed.direction !== "string" ||
    typeof parsed.summary !== "string" ||
    !isStringArray(parsed.efforts) ||
    typeof parsed.reason !== "string"
  ) {
    throw new Error("분석 응답 형식이 올바르지 않습니다.");
  }

  return {
    situation: parsed.situation,
    // 목록에 없는 값이 섞여 들어오면 방어적으로 걸러낸다.
    themes: parsed.themes.filter((theme) => THEME_LIST.includes(theme)),
    moods: parsed.moods.filter((mood) => MOOD_LIST.includes(mood)),
    direction: parsed.direction,
    summary: parsed.summary,
    efforts: parsed.efforts,
    reason: parsed.reason,
  };
}

/**
 * F-03/F-06 분석 본체. 실패(네트워크 오류·JSON 파싱 실패·스키마 불일치)하면
 * 그대로 던진다 — 폴백 처리는 호출부(app/api/analyze)의 몫이다.
 */
export async function analyzeText(transcript: string, now: Date = new Date()): Promise<AnalysisResult> {
  const userContent = `현재 접속 시간대(참고용 — 대화에 더 분명한 단서가 있으면 그걸 우선한다): ${situationHintFromTime(now)}

대화 기록:
${transcript}`;

  const raw = await callOllamaChat([
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: userContent },
  ]);

  return parseAnalysisResult(raw);
}
