export type TimeBand = "dawn" | "morning" | "afternoon" | "evening" | "night";

// 서버(배포 환경은 보통 UTC)와 사용자 기기의 로컬 타임존이 달라 생기는 불일치를 막기 위해 한국 시간대로 고정해서 읽는다.
function getSeoulHour(date: Date): number {
  const hour = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Seoul",
    hour: "numeric",
    hourCycle: "h23",
  }).format(date);
  return Number(hour);
}

export function getTimeBand(date: Date): TimeBand {
  const hour = getSeoulHour(date);
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
