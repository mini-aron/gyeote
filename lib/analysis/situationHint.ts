import { getTimeBand, type TimeBand } from "@/lib/greeting";

const SITUATION_BY_TIME_BAND: Record<TimeBand, string> = {
  dawn: "아침",
  morning: "아침",
  afternoon: "점심",
  evening: "저녁",
  night: "자기 전",
};

// F-03 규칙: situation은 대화 내용 + 접속 시각으로 추론한다. AI 프롬프트의
// 시간대 힌트와 AI 실패 시 폴백(lib/church/analyze.ts)이 같은 매핑을 쓰도록
// 한곳에 모아둔다.
export function situationHintFromTime(now: Date = new Date()): string {
  return SITUATION_BY_TIME_BAND[getTimeBand(now)];
}
