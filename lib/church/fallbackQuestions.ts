import type { TimeBand } from "@/lib/greeting";

export interface FallbackQuestion {
  question: string;
  choices: string[];
}

// Notion "예수님 질문 리스트" 문서의 폴백 질문 세트에서 그대로 가져온 고정 질문.
// AI 연동 자리 — 실제로는 매 대화마다 새로 생성해야 하지만(F-05), AI 자리가
// 아직 정해지지 않아 지금은 이 고정 세트로 교회 대화 화면을 완성해둔다.
export const FIRST_QUESTIONS: Record<TimeBand, FallbackQuestion> = {
  dawn: {
    question: "좋은 아침이야. 밤새 잘 잤어?",
    choices: ["푹 잤어요", "그럭저럭요", "잘 못 잤어요", "거의 못 잤어요"],
  },
  morning: {
    question: "좋은 아침이야. 밤새 잘 잤어?",
    choices: ["푹 잤어요", "그럭저럭요", "잘 못 잤어요", "거의 못 잤어요"],
  },
  afternoon: {
    question: "오전은 어땠어?",
    choices: ["괜찮았어요", "정신없었어요", "힘들었어요", "별일 없었어요"],
  },
  evening: {
    question: "오늘 하루 어땠어?",
    choices: ["좋았어요", "그냥 그랬어요", "힘들었어요", "정신없었어요"],
  },
  night: {
    question: "오늘 하루 수고 많았어. 지금 마음은 어때?",
    choices: ["편안해요", "복잡해요", "지쳤어요", "뿌듯해요"],
  },
};

// "마무리 질문 (추천 직전)" 섹션에서 가져온 고정 꼬리질문 — 스텁 대화의 2번째 턴.
export const FOLLOW_UP_QUESTION: FallbackQuestion = {
  question: "지금 마음에 위로가 필요해, 아니면 힘이 나는 게 필요해?",
  choices: ["위로", "힘", "둘 다"],
};
