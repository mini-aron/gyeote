export interface GeneratedQuestion {
  question: string;
  choices: string[];
  // 이 질문이 교회 대화의 마지막 질문인지 — true면 답변 직후 추천으로 넘어간다.
  isFinal: boolean;
}
