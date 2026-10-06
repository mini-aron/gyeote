"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { GLASS_CARD } from "@/components/glassCard";
import { SongCard } from "@/components/church/SongCard";
import { VerseCard } from "@/components/church/VerseCard";
import { CounselRecordSummary } from "@/components/calendar/CounselRecordRow";
import { useWorld } from "@/lib/world/WorldContext";
import { deleteCounselRecord } from "@/lib/calendar/actions";
import { formatKoreanDate } from "@/lib/calendar/dateUtils";
import type { DayCounselRecord } from "@/lib/calendar/types";

export function CounselRecordDetailView({
  date,
  record,
  bookmarkedIds,
}: {
  date: string;
  record: DayCounselRecord;
  bookmarkedIds: string[];
}) {
  const { flyTo } = useWorld();
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState(false);
  const [pending, startTransition] = useTransition();
  const dayHref = `/calendar/${date}`;

  useEffect(() => {
    flyTo("sky");
  }, [flyTo]);

  const handleDelete = () => {
    setError(false);
    startTransition(async () => {
      const result = await deleteCounselRecord(record.id);
      if (result.ok) router.replace(dayHref);
      else setError(true);
    });
  };

  const hasResult = Boolean(record.verse || record.song || record.resultLine);

  return (
    <main className="pointer-events-none flex min-h-dvh flex-1 flex-col px-4 pb-[calc(96px+env(safe-area-inset-bottom,0px))] pt-[calc(24px+env(safe-area-inset-top,0px))] text-[#f4f1ff]">
      <div className="pointer-events-auto mx-auto flex w-full max-w-md flex-col gap-4">
        <div className="flex items-center gap-2">
          <Link href={dayHref} aria-label="그날 기록으로" className="-ml-2 rounded-full px-2 py-1 text-xl hover:bg-white/10">
            ‹
          </Link>
          <h1 className="font-serif-kr text-xl font-semibold">{formatKoreanDate(date)}</h1>
        </div>

        <div className={`${GLASS_CARD} flex items-center gap-3 px-4 py-3`}>
          <CounselRecordSummary record={record} />
        </div>

        <section className="flex flex-col gap-3">
          <h2 className="text-sm text-[#f4f1ff]/65">그날의 대화</h2>
          <Transcript record={record} />
        </section>

        {hasResult && (
          <section className="flex flex-col gap-3">
            <h2 className="text-sm text-[#f4f1ff]/65">받은 말씀과 찬양</h2>
            {record.verse &&
              (record.verse.isActive ? (
                <VerseCard verse={record.verse} bookmarked={bookmarkedIds.includes(record.verse.id)} />
              ) : (
                <Unavailable label="말씀" />
              ))}
            {record.song &&
              (record.song.isActive ? (
                <SongCard song={record.song} bookmarked={bookmarkedIds.includes(record.song.id)} />
              ) : (
                <Unavailable label="찬양" />
              ))}
            {record.resultLine && (
              <p className={`${GLASS_CARD} whitespace-pre-line px-5 py-4 text-sm leading-7`}>{record.resultLine}</p>
            )}
          </section>
        )}

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
      </div>
    </main>
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
    <div className={`${GLASS_CARD} flex flex-col gap-3 px-5 py-4 text-sm leading-6`}>
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
  );
}
