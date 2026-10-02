// F-07 결과 글은 lib/church/generateResultLine.ts가 대화 내용을 바탕으로
// 매번 새로 쓴다. 이 고정 문구 풀은 그 AI 호출이 실패했을 때만 쓰는
// 폴백이다(app/api/recommend).
const RESULT_LINES = [
  "오늘도 여기까지 와주셔서 고마워요. 잠깐이라도 마음 나눠주셔서 좋았어요.",
  "짧게 나눈 이야기였지만, 마음 잘 들었어요.",
  "오늘 하루도 애쓰셨어요. 잠깐이라도 여기서 쉬어가세요.",
];

export function pickResultLine(): string {
  const index = Math.floor(Math.random() * RESULT_LINES.length);
  return RESULT_LINES[index];
}
