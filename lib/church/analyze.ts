import type { ConversationTags } from "@/lib/analysis/types";
import { situationHintFromTime } from "@/lib/analysis/situationHint";

/**
 * F-03 예외처리 폴백: "AI 응답 실패/JSON 파싱 실패 시 접속 시간대 기준으로만
 * 추천". app/api/analyze가 lib/analysis/analyzeText(로컬 Ollama 호출)를 시도하다
 * 실패하면 이 함수로 넘어온다. 대화 내용은 보지 않고 접속 시각으로만
 * situation을 추론하고 themes/moods는 고정값을 반환한다.
 */
export function analyzeConversation(now: Date = new Date()): ConversationTags {
  return {
    situation: situationHintFromTime(now),
    themes: ["평안", "위로"],
    moods: ["잔잔함", "따뜻함"],
  };
}
