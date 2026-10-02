"use client";

import type { ReactNode } from "react";
import { VerseCard } from "./VerseCard";
import { SongCard } from "./SongCard";
import type { RecommendResult } from "@/lib/recommend/types";
import { buildShareText } from "@/lib/share/buildShareText";

interface ChurchResultProps {
  resultLine: string;
  verse: RecommendResult["verse"];
  song: RecommendResult["song"];
  retriesLeft: number;
  onRetrySong: () => void;
  onRestart: () => void;
  onMoveToBackyard: () => void;
}

export function ChurchResult({
  resultLine,
  verse,
  song,
  retriesLeft,
  onRetrySong,
  onRestart,
  onMoveToBackyard,
}: ChurchResultProps) {
  async function handleShare() {
    const shareText = buildShareText(verse, song);
    if (!shareText) return;
    const url = window.location.href;

    if (navigator.share) {
      try {
        await navigator.share({ text: shareText, url });
        return;
      } catch {
        // 사용자가 공유 시트를 취소했거나 지원 안 하는 대상 — 클립보드 복사로 이어감
      }
    }

    try {
      await navigator.clipboard.writeText(`${shareText}\n${url}`);
    } catch {
      // 클립보드 접근 실패 — 공유는 부가 기능이라 조용히 무시
    }
  }

  return (
    <div className="pointer-events-none flex flex-1 flex-col justify-end px-4 pb-[calc(96px+env(safe-area-inset-bottom,0px))] pt-24">
      <div className="pointer-events-auto flex flex-col gap-4">
        <p className="text-sm leading-relaxed text-[#f4f1ff]/90">{resultLine}</p>
        <VerseCard verse={verse} />
        <SongCard song={song} />
        <div className="flex flex-wrap gap-2 text-xs">
          <ActionButton onClick={onRetrySong} disabled={retriesLeft <= 0}>
            다른 곡 추천받기{retriesLeft > 0 ? ` (${retriesLeft}회 남음)` : ""}
          </ActionButton>
          <ActionButton onClick={onMoveToBackyard}>뒤뜰에서 더 얘기하기</ActionButton>
          <ActionButton onClick={handleShare}>공유하기</ActionButton>
          <ActionButton onClick={onRestart}>처음부터</ActionButton>
        </div>
      </div>
    </div>
  );
}

function ActionButton({
  children,
  onClick,
  disabled,
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-2 text-[#f4f1ff]/80 transition-colors hover:bg-white/[0.1] disabled:opacity-40"
    >
      {children}
    </button>
  );
}
