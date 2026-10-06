import Link from "next/link";
import { GLASS_CARD } from "@/components/glassCard";
import { TimeBandIcon } from "@/components/calendar/TimeBandIcon";
import { formatKstTime } from "@/lib/calendar/dateUtils";
import { getTimeBand } from "@/lib/greeting";
import type { DayCounselRecord } from "@/lib/calendar/types";

export function CounselRecordSummary({ record }: { record: DayCounselRecord }) {
  return (
    <>
      <TimeBandIcon band={getTimeBand(new Date(record.createdAt))} />
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex items-center gap-2 text-sm">
          <span>{formatKstTime(record.createdAt)}</span>
          <span className="rounded-full bg-white/15 px-2 py-0.5 text-xs text-[#f4f1ff]/85">
            {record.mode === "church" ? "교회" : "뒤뜰"}
          </span>
        </div>
        {record.themes.length > 0 && (
          <ul className="flex flex-wrap gap-1">
            {record.themes.map((theme) => (
              <li
                key={theme}
                className="rounded-full border border-white/10 bg-white/10 px-2 py-0.5 text-[11px] text-[#f4f1ff]/80"
              >
                {theme}
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}

export function CounselRecordRow({ date, record }: { date: string; record: DayCounselRecord }) {
  return (
    <Link
      href={`/calendar/${date}/${record.id}`}
      className={`${GLASS_CARD} flex items-center gap-3 px-4 py-3 transition-colors hover:bg-white/[0.12]`}
    >
      <CounselRecordSummary record={record} />
      <span aria-hidden="true" className="text-lg text-[#c9bcff]">
        ›
      </span>
    </Link>
  );
}
