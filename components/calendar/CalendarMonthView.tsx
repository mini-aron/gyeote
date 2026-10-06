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

  const counselDates = new Set(markers.counselDates);
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
              return (
                <Link
                  key={date}
                  href={`/calendar/${date}`}
                  aria-label={`${month}월 ${day}일`}
                  className="flex flex-col items-center gap-1 rounded-xl py-1.5 hover:bg-white/10"
                >
                  <span
                    className={`flex h-7 w-7 items-center justify-center rounded-full text-sm ${
                      isToday ? "bg-[#c9bcff]/30 font-semibold ring-1 ring-[#c9bcff]" : ""
                    }`}
                  >
                    {day}
                  </span>
                  <span className="flex h-1.5 gap-1">
                    {counselDates.has(date) && <span className="h-1.5 w-1.5 rounded-full bg-[#ffd877]" />}
                    {eventDates.has(date) && <span className="h-1.5 w-1.5 rounded-full bg-[#7fd6c2]" />}
                  </span>
                </Link>
              );
            })}
          </div>

          <div className="mt-3 flex justify-center gap-4 text-xs text-[#f4f1ff]/60">
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-[#ffd877]" />
              상담 받은 날
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-[#7fd6c2]" />
              일정
            </span>
          </div>
        </div>
      </div>
    </main>
  );
}
