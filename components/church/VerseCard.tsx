"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { GLASS_CARD } from "@/components/glassCard";
import type { VerseResult } from "@/lib/recommend/types";

// 본문을 접었을 때 보이는 높이 — 15px 글씨·28px 줄 간격 기준 약 4줄.
const COLLAPSED_BODY_HEIGHT_PX = 112;

export function VerseCard({ verse }: { verse: VerseResult | null }) {
  if (!verse) {
    return (
      <div className={`${GLASS_CARD} px-5 py-4 text-sm text-[#f4f1ff]/50`}>
        지금은 어울리는 말씀을 찾지 못했어요.
      </div>
    );
  }

  return (
    <div className={`${GLASS_CARD} px-5 py-4`}>
      <p className="text-xs tracking-wide text-[#f4f1ff]/65">
        {verse.reference} · {verse.translation}
      </p>
      <VerseBody key={verse.id} reference={verse.reference} body={verse.body} />
      {(verse.meaning || verse.application) && (
        <div className="mt-3 divide-y divide-white/10 border-t border-white/10">
          {verse.meaning && <VerseNote label="말씀의 뜻" text={verse.meaning} defaultOpen />}
          {verse.application && <VerseNote label="말씀을 내 삶에 적용" text={verse.application} />}
        </div>
      )}
    </div>
  );
}

// 여러 절을 묶은 본문은 DB에 절마다 줄바꿈으로 저장되어 있다. 참조("시편 23:1-6")의 시작 절부터 번호를 붙인다.
function verseLines(reference: string, body: string): { number: number | null; text: string }[] {
  const lines = body.split("\n").filter((line) => line.trim());
  const start = Number(reference.match(/:(\d+)(?:-\d+)?$/)?.[1]);
  if (lines.length < 2 || !Number.isFinite(start)) return [{ number: null, text: body }];
  return lines.map((text, index) => ({ number: start + index, text }));
}

function VerseBody({ reference, body }: { reference: string; body: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(true);
  const [overflows, setOverflows] = useState(false);

  // 접기 버튼이 필요한지(본문이 접힌 높이보다 긴지)는 렌더된 뒤에야 알 수 있어서 layout effect에서 잰다.
  useLayoutEffect(() => {
    const element = ref.current;
    if (element) setOverflows(element.scrollHeight > COLLAPSED_BODY_HEIGHT_PX + 1);
  }, [body]);

  const lines = verseLines(reference, body);

  return (
    <div className="mt-2">
      <div
        ref={ref}
        className="space-y-1 overflow-hidden text-[15px] leading-7 text-[#f4f1ff]"
        style={expanded ? undefined : { maxHeight: COLLAPSED_BODY_HEIGHT_PX }}
      >
        {lines.map((line, index) => (
          <p key={index} className="flex gap-2">
            {line.number !== null && (
              <span className="w-5 shrink-0 text-right text-xs leading-7 text-[#c9bcff]/80 tabular-nums">
                {line.number}
              </span>
            )}
            <span>{line.text}</span>
          </p>
        ))}
      </div>
      {overflows && (
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="mt-1 text-xs text-[#c9bcff]"
        >
          {expanded ? "접기 ⌃" : "전체 보기 ⌄"}
        </button>
      )}
    </div>
  );
}

function VerseNote({ label, text, defaultOpen = false }: { label: string; text: string; defaultOpen?: boolean }) {
  return (
    <details className="group" open={defaultOpen}>
      <summary className="flex cursor-pointer list-none items-center justify-between py-2.5 text-xs font-medium tracking-wide text-[#c9bcff] [&::-webkit-details-marker]:hidden">
        {label}
        <span className="text-[#c9bcff]/70 transition-transform group-open:rotate-180">⌄</span>
      </summary>
      <p className="pb-3 text-sm leading-6 text-[#f4f1ff]/90">{text}</p>
    </details>
  );
}
