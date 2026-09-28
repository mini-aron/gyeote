import type { TimeBand } from "@/lib/greeting";

export interface FallbackQuestion {
  question: string;
  choices: string[];
}

// Notion "질문 리스트" 문서의 폴백 질문 세트에서 그대로 가져온 고정 질문.
// F-05는 매 대화마다 AI(lib/church/generateQuestion.ts)가 새로 질문을 생성하고,
// 이 세트는 그 호출이 실패했을 때(app/api/church-question)만 쓰는 폴백이다.
// question은 존댓말, choices는 반말 — generateQuestion.ts의 말투 규칙과 동일.
export const FIRST_QUESTIONS: Record<TimeBand, FallbackQuestion> = {
  dawn: {
    question: "좋은 아침이에요. 밤새 잘 주무셨어요?",
    choices: ["푹 잤어", "그럭저럭", "잘 못 잤어", "거의 못 잤어"],
  },
  morning: {
    question: "좋은 아침이에요. 밤새 잘 주무셨어요?",
    choices: ["푹 잤어", "그럭저럭", "잘 못 잤어", "거의 못 잤어"],
  },
  afternoon: {
    question: "오전은 어떠셨어요?",
    choices: ["괜찮았어", "정신없었어", "힘들었어", "별일 없었어"],
  },
  evening: {
    question: "오늘 하루 어떠셨어요?",
    choices: ["좋았어", "그냥 그랬어", "힘들었어", "정신없었어"],
  },
  night: {
    question: "오늘 하루 수고 많으셨어요. 지금 마음은 어떠세요?",
    choices: ["편안해", "복잡해", "지쳤어", "뿌듯해"],
  },
};

// "마무리 질문 (추천 직전)" 섹션에서 가져온 고정 꼬리질문 — 2번째 턴 이후
// 아무 시점에서나 AI 호출이 실패하면 이 질문으로 바로 마무리한다(isFinal: true).
// 추천 방향을 가르는 질문이라 choices는 서로 겹치지 않는 테마(THEME_OPTIONS의
// 위로·소망·평안·기쁨)에 하나씩 대응시킨다 — "위로/힘/둘 다"처럼 비슷하거나
// 정보가 없는 선택지를 두지 않는다.
export const FOLLOW_UP_QUESTION: FallbackQuestion = {
  question: "오늘 이 시간이 어떤 시간이 되면 좋겠어요?",
  choices: ["그냥 토닥여줬으면 해", "다시 힘을 얻고 싶어", "마음이 조용해졌으면 해", "좋은 마음을 나누고 싶어"],
};
