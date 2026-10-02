"use client";

// 문구는 명세상 "전문가 검토 후 확정" 대상인 임시안이다.
export function CrisisNotice({ onRestart }: { onRestart: () => void }) {
  return (
    <div className="pointer-events-none flex flex-1 flex-col justify-end px-4 pb-[calc(96px+env(safe-area-inset-bottom,0px))] pt-24">
      <div className="pointer-events-auto flex flex-col gap-4 rounded-2xl border border-white/10 bg-[#0d0b1a]/70 px-5 py-5 backdrop-blur-sm">
        <p className="text-sm leading-relaxed text-[#f4f1ff]">
          털어놓아 주셔서 고마워요. 지금 많이 버거우신 것 같아요.
        </p>
        <p className="text-sm leading-relaxed text-[#f4f1ff]/85">
          혼자 견디지 않으셔도 돼요. 지금 바로 이야기를 들어줄 수 있는 분들이 있어요.
          가까운 사람이나 믿을 만한 분께 지금 마음을 꼭 나눠주세요.
        </p>

        <div className="flex flex-col gap-1 rounded-xl border border-white/10 bg-white/[0.06] px-4 py-3">
          <span className="text-xs text-[#f4f1ff]/60">자살예방상담전화 · 24시간</span>
          <a href="tel:109" className="text-lg font-medium text-[#f4f1ff]">
            109
          </a>
          <span className="text-xs text-[#f4f1ff]/50">
            위급한 상황이라면 112 또는 119로 바로 연락해주세요.
          </span>
        </div>

        <button
          type="button"
          onClick={onRestart}
          className="self-center rounded-full border border-white/15 bg-white/[0.08] px-5 py-2 text-sm text-[#f4f1ff]/90 transition-colors hover:bg-white/[0.14]"
        >
          처음으로
        </button>
      </div>
    </div>
  );
}
