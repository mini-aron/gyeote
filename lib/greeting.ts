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
  dawn: "이른 아침이네, 오늘 하루도 곁에 있을게",
  morning: "좋은 아침이야",
  afternoon: "오늘 하루 잘 보내고 있어?",
  evening: "오늘 하루 어땠어?",
  night: "오늘 하루 수고했어",
};

export function getGreeting(date: Date, isReturning: boolean): string {
  const base = GREETINGS[getTimeBand(date)];
  return isReturning ? `또 왔구나. ${base}` : base;
}
