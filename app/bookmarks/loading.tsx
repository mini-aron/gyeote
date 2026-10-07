import { GLASS_CARD } from "@/components/glassCard";
import { SkeletonBlock } from "@/components/SkeletonBlock";

const SKELETON_CARD_COUNT = 3;

export default function Loading() {
  return (
    <main className="pointer-events-none flex min-h-dvh flex-1 flex-col px-4 pb-[calc(96px+env(safe-area-inset-bottom,0px))] pt-[calc(24px+env(safe-area-inset-top,0px))] text-[#f4f1ff]">
      <div role="status" aria-busy="true" className="pointer-events-none mx-auto flex w-full max-w-md flex-col gap-4">
        <span className="sr-only">불러오는 중</span>
        <h1 className="font-serif-kr text-xl font-semibold">북마크</h1>

        <div className={`${GLASS_CARD} flex p-1 text-sm`}>
          <span className="flex-1 rounded-xl py-2 text-center text-[#f4f1ff]/60">말씀</span>
          <span className="flex-1 rounded-xl py-2 text-center text-[#f4f1ff]/60">찬양</span>
        </div>

        {Array.from({ length: SKELETON_CARD_COUNT }, (_, index) => (
          <div key={index} className={`${GLASS_CARD} flex flex-col gap-3 px-5 py-4`}>
            <SkeletonBlock className="h-4 w-32 rounded-md" />
            <SkeletonBlock className="h-4 w-full rounded-md" />
            <SkeletonBlock className="h-4 w-3/4 rounded-md" />
          </div>
        ))}
      </div>
    </main>
  );
}
