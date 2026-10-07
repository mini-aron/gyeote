"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { MonthGrid } from "@/components/calendar/MonthGrid";
import { useWorld } from "@/lib/world/WorldContext";
import {
  formatMonthKey,
  isValidMonthString,
  parseMonth,
  shiftMonth,
} from "@/lib/calendar/dateUtils";
import { loadMonthMarkers } from "@/lib/calendar/actions";
import type { MonthMarkers } from "@/lib/calendar/types";

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

  return <MonthGrid year={year} month={month} today={today} markers={markers} loading={isLoading} onShift={handleShift} />;
}
