import { GLASS_CARD } from "@/components/glassCard";
import { SkeletonBlock } from "@/components/SkeletonBlock";

export default function Loading() {
  return (
    <main className="pointer-events-none flex min-h-dvh flex-1 flex-col px-4 pb-[calc(96px+env(safe-area-inset-bottom,0px))] pt-[calc(24px+env(safe-area-inset-top,0px))] text-[#f4f1ff]">
      <div role="status" aria-busy="true" className="pointer-events-none mx-auto flex w-full max-w-md flex-col gap-4">
        <span className="sr-only">불러오는 중</span>
        <div className="flex items-center gap-2">
          <span aria-hidden="true" className="-ml-2 px-2 py-1 text-xl text-[#f4f1ff]/40">
            ‹
          </span>
          <p className="text-sm text-[#f4f1ff]/65">찬양</p>
        </div>

        <section className={`${GLASS_CARD} flex flex-col gap-4 px-5 py-5`}>
          <div className="flex flex-col gap-2">
            <SkeletonBlock className="h-7 w-48 rounded-md" />
            <SkeletonBlock className="h-5 w-24 rounded-md" />
          </div>
          <SkeletonBlock className="aspect-video w-full rounded-xl" />
          <SkeletonBlock className="h-4 w-full rounded-md" />
          <SkeletonBlock className="h-4 w-3/4 rounded-md" />
        </section>
      </div>
    </main>
  );
}
