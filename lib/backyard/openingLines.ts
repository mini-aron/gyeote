// AI 연동 자리 (F-02) — "입력 전 짧은 한마디로 말문을 열어준다"는 매번 새로
// 생성해야 하지만, AI 자리가 아직 미정이라 고정 문구 풀에서 고른다.
const OPENING_LINES = [
  "여기서는 편하게 이야기하셔도 돼요. 무슨 일이 있으셨어요?",
  "오늘 있었던 일, 편하게 풀어놓으셔도 괜찮아요.",
  "천천히 쓰셔도 돼요. 다 들을게요.",
];

export function pickOpeningLine(): string {
  const index = Math.floor(Math.random() * OPENING_LINES.length);
  return OPENING_LINES[index];
}

export const CHURCH_CONTINUATION_LINE =
  "교회에서 나눈 이야기, 여기서 이어서 들을게요. 다 못 한 말이 있으면 편하게 적어주세요.";
