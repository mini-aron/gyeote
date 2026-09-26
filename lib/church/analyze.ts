import { getTimeBand, type TimeBand } from "@/lib/greeting";
import type { ConversationTags } from "./types";

const SITUATION_BY_TIME_BAND: Record<TimeBand, string> = {
  dawn: "아침",
  morning: "아침",
  afternoon: "점심",
  evening: "저녁",
  night: "자기 전",
};

/**
 * AI 연동 자리 (F-06) — 실제로는 대화 내용을 분석해 situation/themes/moods를
 * 뽑아야 하지만, AI API가 아직 미정이라 접속 시각만으로 situation을 추론하고
 * themes/moods는 고정값을 반환한다. 반환 형태(ConversationTags)는 F-03/F-06
 * 명세의 JSON 형태와 동일하게 유지해서, 나중에 이 함수 내부만 AI 호출로
 * 교체하면 되도록 해둔다.
 */
export function analyzeConversation(now: Date = new Date()): ConversationTags {
  return {
    situation: SITUATION_BY_TIME_BAND[getTimeBand(now)],
    themes: ["평안", "위로"],
    moods: ["잔잔함", "따뜻함"],
  };
}
