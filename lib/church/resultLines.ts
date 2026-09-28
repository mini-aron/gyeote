// AI 연동 자리 (F-07) — 실제로는 대화 내용을 구체적으로 짚어주는 짧은 글을
// 매번 새로 써야 하지만, 지금은 화면을 완성해두기 위해 고정 문구 풀에서 골라
// 보여준다. 나중에 이 함수만 AI 호출로 교체한다.
const RESULT_LINES = [
  "오늘도 여기까지 와주셔서 고마워요. 잠깐이라도 마음 나눠주셔서 좋았어요.",
  "짧게 나눈 이야기였지만, 마음 잘 들었어요.",
  "오늘 하루도 애쓰셨어요. 잠깐이라도 여기서 쉬어가세요.",
];

export function pickResultLine(): string {
  const index = Math.floor(Math.random() * RESULT_LINES.length);
  return RESULT_LINES[index];
}
