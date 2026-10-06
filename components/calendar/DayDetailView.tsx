"use client";

import { useEffect } from "react";
import Link from "next/link";
import { GLASS_CARD } from "@/components/glassCard";
import { useWorld } from "@/lib/world/WorldContext";
import { formatKoreanDate } from "@/lib/calendar/dateUtils";
import type { DayCounselRecord, DayEvent } from "@/lib/calendar/types";
import { CounselRecordCard } from "@/components/calendar/CounselRecordCard";
import { EventSection } from "@/components/calendar/EventSection";

interface DayDetailViewProps {
  date: string;
  records: DayCounselRecord[];
  events: DayEvent[];
  bookmarkedIds: string[];
}

export function DayDetailView({ date, records, events, bookmarkedIds }: DayDetailViewProps) {
  const { flyTo } = useWorld();

  useEffect(() => {
    flyTo("sky");
  }, [flyTo]);

  return (
    <main className="pointer-events-none flex min-h-dvh flex-1 flex-col px-4 pb-[calc(96px+env(safe-area-inset-bottom,0px))] pt-[calc(24px+env(safe-area-inset-top,0px))] text-[#f4f1ff]">
      <div className="pointer-events-auto mx-auto flex w-full max-w-md flex-col gap-4">
        <div className="flex items-center gap-2">
          <Link
            href={`/calendar?month=${date.slice(0, 7)}`}
            aria-label="달력으로"
            className="-ml-2 rounded-full px-2 py-1 text-xl hover:bg-white/10"
          >
            ‹
          </Link>
          <h1 className="font-serif-kr text-xl font-semibold">{formatKoreanDate(date)}</h1>
        </div>

        <section className="flex flex-col gap-4">
          <h2 className="text-sm text-[#f4f1ff]/65">상담 기록</h2>
          {records.length === 0 ? (
            <p className={`${GLASS_CARD} px-5 py-6 text-center text-sm text-[#f4f1ff]/60`}>
              이날은 남긴 상담 기록이 없어요.
            </p>
          ) : (
            records.map((record) => (
              <CounselRecordCard key={record.id} record={record} bookmarkedIds={bookmarkedIds} />
            ))
          )}
        </section>

        <EventSection date={date} events={events} />
      </div>
    </main>
  );
}
