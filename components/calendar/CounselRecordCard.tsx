"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { GLASS_CARD } from "@/components/glassCard";
import { SongCard } from "@/components/church/SongCard";
import { VerseCard } from "@/components/church/VerseCard";
import { deleteCounselRecord } from "@/lib/calendar/actions";
import { formatKstTime } from "@/lib/calendar/dateUtils";
import type { DayCounselRecord } from "@/lib/calendar/types";

export function CounselRecordCard({
  record,
  bookmarkedIds,
}: {
  record: DayCounselRecord;
  bookmarkedIds: string[];
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState(false);
  const [pending, startTransition] = useTransition();

  const handleDelete = () => {
    setError(false);
    startTransition(async () => {
      const result = await deleteCounselRecord(record.id);
      if (result.ok) router.refresh();
      else setError(true);
    });
  };

  return (
    <article className="flex flex-col gap-3">
      <div className="flex items-center gap-2 text-xs text-[#f4f1ff]/70">
        <span>{formatKstTime(record.createdAt)}</span>
        <span className="rounded-full bg-white/15 px-2 py-0.5 text-[#f4f1ff]/85">
          {record.mode === "church" ? "교회" : "뒤뜰"}
        </span>
      </div>

      {record.verse &&
        (record.verse.isActive ? (
          <VerseCard verse={record.verse} bookmarked={bookmarkedIds.includes(record.verse.id)} />
        ) : <Unavailable label="말씀" />)}
      {record.song &&
        (record.song.isActive ? (
          <SongCard song={record.song} bookmarked={bookmarkedIds.includes(record.song.id)} />
        ) : <Unavailable label="찬양" />)}

      {record.resultLine && (
        <p className={`${GLASS_CARD} whitespace-pre-line px-5 py-4 text-sm leading-7`}>{record.resultLine}</p>
      )}

      {record.themes.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {record.themes.map((theme) => (
            <li
              key={theme}
              className="rounded-full border border-white/10 bg-white/10 px-2.5 py-1 text-xs text-[#f4f1ff]/80"
            >
              {theme}
            </li>
          ))}
        </ul>
      )}

      <Transcript record={record} />

      {confirming ? (
        <div className={`${GLASS_CARD} flex flex-col gap-3 px-5 py-4 text-sm`}>
          <p>이 상담 기록을 삭제할까요? 되돌릴 수 없어요.</p>
          {error && <p className="text-xs text-[#ffb3b3]">삭제하지 못했어요. 잠시 후 다시 시도해 주세요.</p>}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setConfirming(false)}
              disabled={pending}
              className="rounded-xl border border-white/10 px-3 py-2 text-xs text-[#f4f1ff]/80"
            >
              취소
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={pending}
              className="rounded-xl bg-[#ff8f8f]/80 px-3 py-2 text-xs font-medium text-[#1b1530] disabled:opacity-60"
            >
              {pending ? "삭제 중" : "삭제"}
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="self-end text-xs text-[#f4f1ff]/55 underline underline-offset-2"
        >
          기록 삭제
        </button>
      )}
    </article>
  );
}

function Unavailable({ label }: { label: string }) {
  return (
    <div className={`${GLASS_CARD} px-5 py-4 text-sm text-[#f4f1ff]/60`}>
      {label}: 더 이상 제공되지 않아요
    </div>
  );
}

function Transcript({ record }: { record: DayCounselRecord }) {
  const hasContent = Boolean(record.church?.length) || Boolean(record.backyardText);
  return (
    <details className={`${GLASS_CARD} group px-5`}>
      <summary className="flex cursor-pointer list-none items-center justify-between py-3 text-sm text-[#c9bcff] [&::-webkit-details-marker]:hidden">
        그날의 대화 다시 보기
        <span className="transition-transform group-open:rotate-180">⌄</span>
      </summary>
      <div className="flex flex-col gap-3 pb-4 text-sm leading-6">
        {!hasContent && <p className="text-[#f4f1ff]/60">대화 기록을 남기지 않았어요</p>}
        {record.church?.map((turn, index) => (
          <div key={index} className="flex flex-col gap-2">
            <p className="max-w-[85%] self-start rounded-2xl rounded-tl-sm bg-white/10 px-3 py-2">{turn.question}</p>
            <p className="max-w-[85%] self-end rounded-2xl rounded-tr-sm bg-[#c9bcff]/25 px-3 py-2">{turn.answer}</p>
          </div>
        ))}
        {record.backyardText && (
          <p className="whitespace-pre-wrap rounded-2xl bg-white/10 px-3 py-2">{record.backyardText}</p>
        )}
      </div>
    </details>
  );
}
