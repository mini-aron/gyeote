// AI 연동 자리 (F-02) — "입력 전 예수님의 짧은 한마디로 말문을 열어준다"는
// 매번 새로 생성해야 하지만, AI 자리가 아직 미정이라 고정 문구 풀에서 고른다.
const OPENING_LINES = [
  "여기선 편하게 얘기해도 돼. 무슨 일이 있었어?",
  "오늘 있었던 일, 편하게 풀어놔도 괜찮아.",
  "천천히 써도 돼. 다 들을게.",
];

export function pickOpeningLine(): string {
  const index = Math.floor(Math.random() * OPENING_LINES.length);
  return OPENING_LINES[index];
}
