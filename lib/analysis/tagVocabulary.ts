// 기획안 "5. 데이터 정의 · 태그 값 (공통)" + Supabase 시드 데이터와 동일한 목록.
// AI 분석은 반드시 이 목록 안에서만 태그를 골라야 한다 — 지어낸 값 금지.
export const THEME_OPTIONS = [
  "위로",
  "감사",
  "회개",
  "소망",
  "사랑",
  "평안",
  "헌신",
  "기쁨",
] as const;

export const SITUATION_OPTIONS = [
  "아침",
  "점심",
  "저녁",
  "드라이브",
  "자기 전",
  "위로받고 싶을 때",
] as const;

export const MOOD_OPTIONS = ["잔잔함", "신남", "웅장함", "따뜻함", "고요함"] as const;
