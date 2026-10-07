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
          <SkeletonBlock className="h-7 w-40 rounded-md" />
        </div>

        <div className={`${GLASS_CARD} flex items-center gap-3 px-4 py-3`}>
          <SkeletonBlock className="h-8 w-8 shrink-0 rounded-full" />
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <SkeletonBlock className="h-5 w-24 rounded-md" />
            <SkeletonBlock className="h-5 w-32 rounded-full" />
          </div>
        </div>

        <section className="flex flex-col gap-3">
          <h2 className="text-sm text-[#f4f1ff]/65">그날의 대화</h2>
          <div className={`${GLASS_CARD} flex flex-col gap-3 px-5 py-4`}>
            <SkeletonBlock className="h-10 w-[70%] self-start rounded-2xl" />
            <SkeletonBlock className="h-10 w-[60%] self-end rounded-2xl" />
          </div>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-sm text-[#f4f1ff]/65">받은 말씀과 찬양</h2>
          <div className={`${GLASS_CARD} flex flex-col gap-3 px-5 py-4`}>
            <SkeletonBlock className="h-4 w-32 rounded-md" />
            <SkeletonBlock className="h-4 w-full rounded-md" />
            <SkeletonBlock className="h-4 w-4/5 rounded-md" />
          </div>
        </section>
      </div>
    </main>
  );
}
