// "배고파 죽겠다" 같은 과장 표현은 피하려고 "~고 싶다/싫다" 형태 위주로 잡는다.
const CRISIS_PATTERNS: readonly RegExp[] = [
  /죽고\s*싶/,
  /죽어\s*버리고\s*싶/,
  /죽는\s*게\s*나을/,
  /자살/,
  /자해/,
  /극단적(인)?\s*(선택|생각)/,
  /살고\s*싶지\s*않/,
  /살기\s*싫/,
  /사라지고\s*싶/,
  /(삶|인생|목숨)을?\s*끝내/,
  /손목을?\s*긋/,
  /뛰어\s*내리고\s*싶/,
];

export function detectCrisisSignal(text: string): boolean {
  return CRISIS_PATTERNS.some((pattern) => pattern.test(text));
}
