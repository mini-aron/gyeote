"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { MonthGrid } from "@/components/calendar/MonthGrid";
import { parseMonth } from "@/lib/calendar/dateUtils";
import { getSeoulDateString } from "@/lib/greeting";

function MonthFromParams() {
  const monthParam = useSearchParams().get("month") ?? undefined;
  const today = getSeoulDateString(new Date());
  const { year, month } = parseMonth(monthParam, today);
  return <MonthGrid year={year} month={month} today={today} markers={null} />;
}

function CurrentMonth() {
  const today = getSeoulDateString(new Date());
  const { year, month } = parseMonth(undefined, today);
  return <MonthGrid year={year} month={month} today={today} markers={null} />;
}

export function CalendarMonthSkeleton() {
  return (
    <Suspense fallback={<CurrentMonth />}>
      <MonthFromParams />
    </Suspense>
  );
}
