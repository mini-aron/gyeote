import type { VerseResult } from "@/lib/recommend/types";

export function VerseCard({ verse }: { verse: VerseResult | null }) {
  if (!verse) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.05] px-5 py-4 text-sm text-[#f4f1ff]/50">
        지금은 어울리는 말씀을 찾지 못했어.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.05] px-5 py-4">
      <p className="text-xs tracking-wide text-[#f4f1ff]/50">
        {verse.reference} · {verse.translation}
      </p>
      <p className="mt-2 text-sm leading-relaxed text-[#f4f1ff]">{verse.body}</p>
    </div>
  );
}
