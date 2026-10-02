// 교회 대화 턴 수 경계. generateQuestion.ts(서버, isFinal 강제)와
// ChurchChat.tsx(클라이언트, 조기 종료 버튼 노출 시점)가 같은 값을 봐야 해서
// 여기 둔다 — generateQuestion.ts는 "server-only"라 클라이언트에서 직접
// import할 수 없다.
// Notion "질문 리스트" 문서는 "총 2~4턴"이 기본 스펙이지만 대화를 더 길게
// 끌고 가길 원해서 최소 4턴 · 최대 8턴으로 늘렸었다. 그래도 대화가 짧다는
// 피드백이 들어와 최소 6턴 · 최대 10턴으로 다시 늘렸다(사용자 결정, 2026-10-02).
export const MIN_TURNS = 6;
export const MAX_TURNS = 10;

export interface GeneratedQuestion {
  question: string;
  choices: string[];
  // 이 질문이 교회 대화의 마지막 질문인지 — true면 답변 직후 추천으로 넘어간다.
  isFinal: boolean;
}
