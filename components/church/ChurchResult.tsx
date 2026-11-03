"use client";

import type { ReactNode } from "react";
import { VerseCard } from "./VerseCard";
import { SongCard } from "./SongCard";
import type { RecommendResult } from "@/lib/recommend/types";
import { ShareButton } from "@/components/share/ShareButton";
import { savePendingResult } from "@/lib/bookmarks/pendingResult";
import { useBookmarkStatus } from "@/components/bookmarks/useBookmarkStatus";
import { SpeechBubble } from "@/components/SpeechBubble";
import { InstallBanner } from "@/components/pwa/InstallBanner";

interface ChurchResultProps {
  resultLine: string;
  verse: RecommendResult["verse"];
  song: RecommendResult["song"];
  retriesLeft: number;
  songLoading: boolean;
  onRetrySong: () => void;
  onRestart: () => void;
  onMoveToBackyard: () => void;
}

export function ChurchResult({
  resultLine,
  verse,
  song,
  retriesLeft,
  songLoading,
  onRetrySong,
  onRestart,
  onMoveToBackyard,
}: ChurchResultProps) {
  const bookmarkStatus = useBookmarkStatus(verse?.id, song?.id);
  const saveSnapshot = () => savePendingResult({ mode: "church", verse, song, resultLine });

  return (
    <div className="pointer-events-none flex flex-1 flex-col justify-end px-4 pb-[calc(96px+env(safe-area-inset-bottom,0px))] pt-24">
      <div className="pointer-events-auto flex flex-col gap-4">
        {resultLine && <SpeechBubble>{resultLine}</SpeechBubble>}
        <VerseCard verse={verse} bookmarked={bookmarkStatus.verse} onBeforeLogin={saveSnapshot} />
        <div aria-busy={songLoading} className={songLoading ? "pointer-events-none transition-opacity motion-safe:animate-pulse motion-reduce:opacity-50" : "transition-opacity"}>
          <SongCard song={song} bookmarked={bookmarkStatus.song} onBeforeLogin={saveSnapshot} />
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <ShareButton verse={verse} song={song} />
          <ActionButton onClick={onRetrySong} disabled={retriesLeft <= 0 || songLoading}>
            다른 곡 추천받기{retriesLeft > 0 ? ` (${retriesLeft}회 남음)` : ""}
          </ActionButton>
          <ActionButton onClick={onMoveToBackyard} disabled={songLoading}>뒤뜰에서 더 얘기하기</ActionButton>
          <ActionButton onClick={onRestart} disabled={songLoading}>처음부터</ActionButton>
        </div>
        <InstallBanner />
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
