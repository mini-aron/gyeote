import { GLASS_CARD } from "@/components/glassCard";
import { SkeletonBlock } from "@/components/SkeletonBlock";

const SKELETON_CONSENT_COUNT = 5;
const SECTION = "flex flex-col gap-3 border-t border-white/10 pt-4";

export default function Loading() {
  return (
    <main className="pointer-events-none flex min-h-dvh flex-1 flex-col justify-end px-4 pb-[calc(96px+env(safe-area-inset-bottom,0px))] pt-16 text-[#f4f1ff]">
      <div
        role="status"
        aria-busy="true"
        className={`${GLASS_CARD} pointer-events-none mx-auto flex max-h-[calc(100dvh-10rem)] w-full max-w-md flex-col gap-4 overflow-hidden px-5 py-5`}
      >
        <span className="sr-only">불러오는 중</span>
        <div className="flex items-center gap-3">
          <SkeletonBlock className="h-12 w-12 shrink-0 rounded-full" />
          <div className="flex min-w-0 flex-col gap-1.5">
            <p className="text-xs leading-relaxed text-[#f4f1ff]/60">내정보</p>
            <SkeletonBlock className="h-6 w-32 rounded-md" />
          </div>
        </div>

        <section className={SECTION}>
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-sm font-medium">대화 기록 남기기</h2>
            <SkeletonBlock className="h-7 w-12 shrink-0 rounded-full" />
          </div>
          <SkeletonBlock className="h-4 w-4/5 rounded-md" />
        </section>

        <section className={SECTION}>
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-sm font-medium">마케팅 · 홍보 정보 수신</h2>
            <SkeletonBlock className="h-7 w-12 shrink-0 rounded-full" />
          </div>
        </section>

        <section className={SECTION}>
          <h2 className="text-sm font-medium">동의 내역</h2>
          <ul className="flex flex-col gap-3">
            {Array.from({ length: SKELETON_CONSENT_COUNT }, (_, index) => (
              <li key={index} className="flex flex-col gap-2">
                <SkeletonBlock className="h-5 w-40 rounded-md" />
                <SkeletonBlock className="h-[19px] w-56 max-w-full rounded-md" />
              </li>
            ))}
          </ul>
        </section>

        <section className={SECTION}>
          <h2 className="text-sm font-medium">상담 기록 전체 삭제</h2>
          <SkeletonBlock className="h-[19px] w-4/5 rounded-md" />
          <SkeletonBlock className="h-[42px] rounded-xl" />
        </section>

        <section className={SECTION}>
          <SkeletonBlock className="h-[42px] rounded-xl" />
        </section>

        <section className={SECTION}>
          <h2 className="text-sm font-medium text-[#ffb4b4]">회원 탈퇴</h2>
          <SkeletonBlock className="h-[19px] w-full rounded-md" />
          <SkeletonBlock className="h-[42px] rounded-xl" />
        </section>
      </div>
    </main>
  );
}
