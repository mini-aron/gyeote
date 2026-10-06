import type { VerseResult } from "@/lib/recommend/types";

export function VerseCard({ verse }: { verse: VerseResult | null }) {
  if (!verse) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.05] px-5 py-4 text-sm text-[#f4f1ff]/50">
        지금은 어울리는 말씀을 찾지 못했어요.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.05] px-5 py-4">
      <p className="text-xs tracking-wide text-[#f4f1ff]/50">
        {verse.reference} · {verse.translation}
      </p>
      <p className="mt-2 text-sm leading-relaxed text-[#f4f1ff]">{verse.body}</p>
      {(verse.meaning || verse.application) && (
        <div className="mt-3 space-y-3 border-t border-white/10 pt-3">
          {verse.meaning && <VerseNote label="말씀의 뜻" text={verse.meaning} />}
          {verse.application && <VerseNote label="오늘 내 삶에" text={verse.application} />}
        </div>
      )}
    </div>
  );
}

function VerseNote({ label, text }: { label: string; text: string }) {
  return (
    <div>
      <p className="text-[11px] tracking-wide text-[#f4f1ff]/45">{label}</p>
      <p className="mt-1 text-xs leading-relaxed text-[#f4f1ff]/70">{text}</p>
    </div>
  );
}
