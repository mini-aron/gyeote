import { GLASS_CARD } from "@/components/glassCard";
import { SkeletonBlock } from "@/components/SkeletonBlock";

const WEEKDAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];
const SKELETON_WEEK_ROWS = 6;
const DAYS_PER_WEEK = 7;

export default function Loading() {
  return (
    <main className="pointer-events-none flex min-h-dvh flex-1 flex-col px-4 pb-[calc(96px+env(safe-area-inset-bottom,0px))] pt-[calc(24px+env(safe-area-inset-top,0px))] text-[#f4f1ff]">
      <div role="status" aria-busy="true" className="pointer-events-none mx-auto flex w-full max-w-md flex-col gap-4">
        <span className="sr-only">불러오는 중</span>
        <h1 className="font-serif-kr text-xl font-semibold">캘린더</h1>

        <div className={`${GLASS_CARD} px-3 py-4`}>
          <div className="mb-3 flex h-9 items-center justify-center px-1">
            <SkeletonBlock className="h-5 w-28 rounded-md" />
          </div>

          <div className="grid grid-cols-7 text-center text-xs text-[#f4f1ff]/55">
            {WEEKDAY_LABELS.map((label) => (
              <div key={label} className="py-1">
                {label}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-y-1 text-center">
            {Array.from({ length: SKELETON_WEEK_ROWS * DAYS_PER_WEEK }, (_, index) => (
              <div key={index} className="flex flex-col items-center gap-1 py-1.5">
                <SkeletonBlock className="h-7 w-7 rounded-full" />
                <span className="h-3" />
              </div>
            ))}
          </div>

          <div className="mt-3 h-4" />
        </div>
      </div>
    </main>
  );
}
