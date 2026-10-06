const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const MONTH_PATTERN = /^(\d{4})-(\d{2})$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
const MIN_YEAR = 1900;
const MAX_YEAR = 2100;
const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

export function isValidDateString(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const match = value.match(DATE_PATTERN);
  if (!match) return false;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  if (year < MIN_YEAR || year > MAX_YEAR) return false;
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export function isValidTimeString(value: unknown): value is string {
  return typeof value === "string" && TIME_PATTERN.test(value);
}

export function parseMonth(value: string | undefined, fallback: string): { year: number; month: number } {
  const match = (value ?? "").match(MONTH_PATTERN);
  const source = match ?? fallback.match(MONTH_PATTERN) ?? fallback.slice(0, 7).match(MONTH_PATTERN)!;
  const year = Number(source[1]);
  const month = Number(source[2]);
  if (month < 1 || month > 12 || year < MIN_YEAR || year > MAX_YEAR) return parseMonth(undefined, fallback);
  return { year, month };
}

export function formatMonthKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

export function shiftMonth(year: number, month: number, delta: number): string {
  const index = year * 12 + (month - 1) + delta;
  return formatMonthKey(Math.floor(index / 12), (index % 12) + 1);
}

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function firstWeekday(year: number, month: number): number {
  return new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
}

export function formatKoreanDate(dateString: string): string {
  const [year, month, day] = dateString.split("-").map(Number);
  const weekday = WEEKDAYS[new Date(Date.UTC(year, month - 1, day)).getUTCDay()];
  return `${month}월 ${day}일 (${weekday})`;
}

export function formatKstTime(iso: string): string {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(iso));
}

export function formatEventTime(time: string): string {
  return time.slice(0, 5);
}

export function formatKstDate(iso: string): string {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(iso));
}
