"use client";

import { useEffect } from "react";
import Link from "next/link";
import { GLASS_CARD } from "@/components/glassCard";
import { useWorld } from "@/lib/world/WorldContext";
import {
  daysInMonth,
  firstWeekday,
  formatMonthKey,
  shiftMonth,
} from "@/lib/calendar/dateUtils";
import type { MonthMarkers } from "@/lib/calendar/types";

const WEEKDAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

const FOUR_STAR_MIN_COUNSEL_COUNT = 2;
const FIVE_STAR_MIN_COUNSEL_COUNT = 3;
const MOON_MIN_COUNSEL_COUNT = 4;

const COUNSEL_DOT_COLOR = "#ffd877";
const COUNSEL_MOON_COLOR = "#ffe4a0";
const EVENT_DOT_COLOR = "#7fd6c2";

const FOUR_STAR_PATH = "M12 2C12.8 8 16 11.2 22 12C16 12.8 12.8 16 12 22C11.2 16 8 12.8 2 12C8 11.2 11.2 8 12 2z";
const FIVE_STAR_POINTS = "12,2.5 14.6,9 21.5,9.3 16.1,13.6 18,20.5 12,16.6 6,20.5 7.9,13.6 2.5,9.3 9.4,9";
const MOON_PATH = "M20 14.5A8.5 8.5 0 1 1 9.5 3.5a7 7 0 0 0 10.5 11z";

type CounselLevel = "none" | "dot" | "star4" | "star5" | "moon";

const GLOW_CLASS: Record<Exclude<CounselLevel, "none" | "dot">, string> = {
  star4: "drop-shadow-[0_0_2px_rgba(255,216,119,0.45)]",
  star5: "drop-shadow-[0_0_3px_rgba(255,216,119,0.65)]",
  moon: "drop-shadow-[0_0_5px_rgba(255,214,120,0.95)]",
};

function getCounselLevel(count: number): CounselLevel {
  if (count >= MOON_MIN_COUNSEL_COUNT) return "moon";
  if (count >= FIVE_STAR_MIN_COUNSEL_COUNT) return "star5";
  if (count >= FOUR_STAR_MIN_COUNSEL_COUNT) return "star4";
  return count >= 1 ? "dot" : "none";
}

function CounselMark({ level }: { level: CounselLevel }) {
  if (level === "none") return null;
  if (level === "dot") {
    return <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: COUNSEL_DOT_COLOR }} />;
  }
  const fill = level === "moon" ? COUNSEL_MOON_COLOR : COUNSEL_DOT_COLOR;
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={`h-2.5 w-2.5 min-[380px]:h-3 min-[380px]:w-3 ${GLOW_CLASS[level]}`}
      fill={fill}
    >
      {level === "moon" && <path d={MOON_PATH} />}
      {level === "star4" && <path d={FOUR_STAR_PATH} strokeLinejoin="round" stroke={fill} strokeWidth="1" />}
      {level === "star5" && (
        <polygon points={FIVE_STAR_POINTS} strokeLinejoin="round" stroke={fill} strokeWidth="1.5" />
      )}
    </svg>
  );
}

function LegendItem({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="flex h-3 w-3 items-center justify-center">{children}</span>
      {label}
    </span>
  );
}

function buildDayLabel(month: number, day: number, counselCount: number, hasEvent: boolean): string {
  const parts = [`${month}월 ${day}일`];
  if (counselCount > 0) parts.push(`상담 ${counselCount}번`);
  if (hasEvent) parts.push("일정 있음");
  return parts.join(", ");
}

interface CalendarMonthViewProps {
  year: number;
  month: number;
  today: string;
  markers: MonthMarkers;
}

export function CalendarMonthView({ year, month, today, markers }: CalendarMonthViewProps) {
  const { flyTo } = useWorld();

  useEffect(() => {
    flyTo("sky");
  }, [flyTo]);

  const eventDates = new Set(markers.eventDates);
  const key = formatMonthKey(year, month);
  const blanks = firstWeekday(year, month);
  const total = daysInMonth(year, month);

  return (
    <main className="pointer-events-none flex min-h-dvh flex-1 flex-col px-4 pb-[calc(96px+env(safe-area-inset-bottom,0px))] pt-[calc(24px+env(safe-area-inset-top,0px))] text-[#f4f1ff]">
      <div className="pointer-events-auto mx-auto flex w-full max-w-md flex-col gap-4">
        <h1 className="font-serif-kr text-xl font-semibold">캘린더</h1>

        <div className={`${GLASS_CARD} px-3 py-4`}>
          <div className="mb-3 flex items-center justify-between px-1">
            <Link
              href={`/calendar?month=${shiftMonth(year, month, -1)}`}
              replace
              aria-label="이전 달"
              className="rounded-full px-3 py-1 text-lg hover:bg-white/10"
            >
              ‹
            </Link>
            <p className="text-base font-medium">
              {year}년 {month}월
            </p>
            <Link
              href={`/calendar?month=${shiftMonth(year, month, 1)}`}
              replace
              aria-label="다음 달"
              className="rounded-full px-3 py-1 text-lg hover:bg-white/10"
            >
              ›
            </Link>
          </div>

          <div className="grid grid-cols-7 text-center text-xs text-[#f4f1ff]/55">
            {WEEKDAY_LABELS.map((label) => (
              <div key={label} className="py-1">
                {label}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-y-1 text-center">
            {Array.from({ length: blanks }, (_, index) => (
              <div key={`blank-${index}`} />
            ))}
            {Array.from({ length: total }, (_, index) => {
              const day = index + 1;
              const date = `${key}-${String(day).padStart(2, "0")}`;
              const isToday = date === today;
              const counselCount = markers.counselCounts[date] ?? 0;
              const hasEvent = eventDates.has(date);
              return (
                <Link
                  key={date}
                  href={`/calendar/${date}`}
                  aria-label={buildDayLabel(month, day, counselCount, hasEvent)}
                  className="flex flex-col items-center gap-1 rounded-xl py-1.5 hover:bg-white/10"
                >
                  <span
                    className={`flex h-7 w-7 items-center justify-center rounded-full text-sm ${
                      isToday ? "bg-[#c9bcff]/30 font-semibold ring-1 ring-[#c9bcff]" : ""
                    }`}
                  >
                    {day}
                  </span>
                  <span aria-hidden="true" className="flex h-3 items-center gap-1">
                    <CounselMark level={getCounselLevel(counselCount)} />
                    {hasEvent && <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: EVENT_DOT_COLOR }} />}
                  </span>
                </Link>
              );
            })}
          </div>

          <div className="mt-3 flex flex-wrap justify-center gap-x-3 gap-y-1 text-xs text-[#f4f1ff]/60">
            <LegendItem label="상담">
              <CounselMark level="dot" />
            </LegendItem>
            <LegendItem label="일정">
              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: EVENT_DOT_COLOR }} />
            </LegendItem>
          </div>
        </div>
      </div>
    </main>
  );
}
