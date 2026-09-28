export type TimeBand = "dawn" | "morning" | "afternoon" | "evening" | "night";

export function getTimeBand(date: Date): TimeBand {
  const hour = date.getHours();
  if (hour >= 5 && hour < 7) return "dawn";
  if (hour >= 7 && hour < 12) return "morning";
  if (hour >= 12 && hour < 18) return "afternoon";
  if (hour >= 18 && hour < 23) return "evening";
  return "night";
}

const GREETINGS: Record<TimeBand, string> = {
  dawn: "이른 아침이네요, 오늘 하루도 곁에 있을게요",
  morning: "좋은 아침이에요",
  afternoon: "오늘 하루 잘 보내고 계세요?",
  evening: "오늘 하루 어떠셨어요?",
  night: "오늘 하루 수고하셨어요",
};

export function getGreeting(date: Date, isReturning: boolean): string {
  const base = GREETINGS[getTimeBand(date)];
  return isReturning ? `또 오셨네요. ${base}` : base;
}
