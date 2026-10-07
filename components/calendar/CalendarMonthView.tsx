"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { GLASS_CARD } from "@/components/glassCard";
import { useWorld } from "@/lib/world/WorldContext";
import {
  daysInMonth,
  firstWeekday,
  formatMonthKey,
  isValidMonthString,
  parseMonth,
  shiftMonth,
} from "@/lib/calendar/dateUtils";
import { loadMonthMarkers } from "@/lib/calendar/actions";
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

const EMPTY_MARKERS: MonthMarkers = { counselCounts: {}, eventDates: [] };

export function CalendarMonthView({ year: seedYear, month: seedMonth, today, markers: seedMarkers }: CalendarMonthViewProps) {
  const { flyTo } = useWorld();
  const router = useRouter();
  const monthParam = useSearchParams().get("month") ?? undefined;
  const { year, month } = parseMonth(monthParam, today);
  const key = formatMonthKey(year, month);
  const seedKey = formatMonthKey(seedYear, seedMonth);

  const [cache, setCache] = useState<Record<string, MonthMarkers>>({ [seedKey]: seedMarkers });
  const [seed, setSeed] = useState(seedMarkers);
  // 서버가 새로 렌더되면(일정 변경 후 revalidate 등) 이전에 캐시한 달은 낡았을 수 있어 통째로 다시 시드한다.
  if (seed !== seedMarkers) {
    setSeed(seedMarkers);
    setCache({ [seedKey]: seedMarkers });
  }
  const inFlight = useRef(new Map<string, Promise<boolean>>());
  const seedGeneration = useRef(0);
  const [hasNavigated, setHasNavigated] = useState(false);

  useEffect(() => {
    flyTo("sky");
  }, [flyTo]);

  // 재시드 이전에 시작된 요청이 재시드 이후에 도착해 낡은 값을 덮어쓰지 못하게 세대를 올린다.
  useEffect(() => {
    seedGeneration.current += 1;
    inFlight.current.clear();
  }, [seedMarkers]);

  const fetchMonth = useCallback((target: string) => {
    const pending = inFlight.current.get(target);
    if (pending) return pending;
    const generation = seedGeneration.current;
    const request = loadMonthMarkers(target)
      .then((result) => {
        if (!result.ok) return false;
        if (generation === seedGeneration.current) setCache((prev) => ({ ...prev, [target]: result.markers }));
        return true;
      })
      .catch(() => false)
      .finally(() => {
        if (inFlight.current.get(target) === request) inFlight.current.delete(target);
      });
    inFlight.current.set(target, request);
    return request;
  }, []);

  const hasCurrent = key in cache;
  const hasPrev = shiftMonth(year, month, -1) in cache;
  const hasNext = shiftMonth(year, month, 1) in cache;

  // Server Action은 순차 디스패치되므로 현재 달 → 이전 → 다음 순으로 하나씩만 보낸다.
  // 첫 진입에서는 인접 달 프리페치를 미뤄 방문마다 인증 호출이 늘지 않게 한다.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const queue = hasNavigated ? [key, shiftMonth(year, month, -1), shiftMonth(year, month, 1)] : [key];
      for (const target of queue) {
        if (cancelled) return;
        if (!isValidMonthString(target) || target in cache) continue;
        const ok = await fetchMonth(target);
        // 표시 중인 달이 실패하면 서버 경로(로그인/동의 리다이렉트, 에러 화면)로 넘긴다.
        if (!ok && target === key && !cancelled) router.replace(`/calendar?month=${key}`);
      }
    })();
    return () => {
      cancelled = true;
    };
    // cache 전체가 아니라 인접 달 보유 여부에만 반응해 불필요한 재실행을 막는다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, year, month, hasCurrent, hasPrev, hasNext, hasNavigated, fetchMonth, router]);

  const handleShift = (delta: number) => {
    setHasNavigated(true);
    window.history.replaceState(null, "", `/calendar?month=${shiftMonth(year, month, delta)}`);
  };

  const markers = cache[key] ?? EMPTY_MARKERS;
  const isLoading = !(key in cache);
  const eventDates = new Set(markers.eventDates);
  const blanks = firstWeekday(year, month);
  const total = daysInMonth(year, month);

  return (
    <main className="pointer-events-none flex min-h-dvh flex-1 flex-col px-4 pb-[calc(96px+env(safe-area-inset-bottom,0px))] pt-[calc(24px+env(safe-area-inset-top,0px))] text-[#f4f1ff]">
      <div className="pointer-events-auto mx-auto flex w-full max-w-md flex-col gap-4">
        <h1 className="font-serif-kr text-xl font-semibold">캘린더</h1>

        <div className={`${GLASS_CARD} px-3 py-4`}>
          <div className="mb-3 flex items-center justify-between px-1">
            <button
              type="button"
              onClick={() => handleShift(-1)}
              aria-label="이전 달"
              className="rounded-full px-3 py-1 text-lg hover:bg-white/10"
            >
              ‹
            </button>
            <p className="text-base font-medium">
              {year}년 {month}월
            </p>
            <button
              type="button"
              onClick={() => handleShift(1)}
              aria-label="다음 달"
              className="rounded-full px-3 py-1 text-lg hover:bg-white/10"
            >
              ›
            </button>
          </div>

          <div className="grid grid-cols-7 text-center text-xs text-[#f4f1ff]/55">
            {WEEKDAY_LABELS.map((label) => (
              <div key={label} className="py-1">
                {label}
              </div>
            ))}
          </div>

          <div
            aria-busy={isLoading}
            className={`grid grid-cols-7 gap-y-1 text-center transition-opacity ${isLoading ? "opacity-60" : ""}`}
          >
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
                  // 날짜 링크가 30개라 기본 prefetch면 진입·월 이동마다 요청이 30건씩 나가므로, 누를 가능성이 높은 날만 미리 받는다.
                  prefetch={isToday || counselCount > 0 || hasEvent ? null : false}
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
