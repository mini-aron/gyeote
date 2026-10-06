"use client";

import { useState, type ReactNode } from "react";
import { VerseCard } from "@/components/church/VerseCard";
import { SongCard } from "@/components/church/SongCard";
import { PrayerTopicCard } from "./PrayerTopicCard";
import type { RecommendResult } from "@/lib/recommend/types";
import { buildShareText } from "@/lib/share/buildShareText";
import { SpeechBubble } from "@/components/SpeechBubble";

type PrayerStatus = "idle" | "loading" | "done" | "error";

interface BackyardResultProps {
  encouragement: string;
  summary: string;
  verse: RecommendResult["verse"];
  song: RecommendResult["song"];
  retriesLeft: number;
  onRetrySong: () => void;
  onRestart: () => void;
}

export function BackyardResult({
  encouragement,
  summary,
  verse,
  song,
  retriesLeft,
  onRetrySong,
  onRestart,
}: BackyardResultProps) {
  const [prayerStatus, setPrayerStatus] = useState<PrayerStatus>("idle");
  const [prayerTopics, setPrayerTopics] = useState<string[]>([]);

  async function handlePrayerTopic() {
    setPrayerStatus("loading");
    try {
      const response = await fetch("/api/prayer-topic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ summary }),
      });
      if (!response.ok) throw new Error("prayer_topic_failed");
      const data = (await response.json()) as { topics: string[] };
      setPrayerTopics(data.topics);
      setPrayerStatus("done");
    } catch {
      setPrayerStatus("error");
    }
  }

  async function handleShare() {
    const shareText = buildShareText(verse, song);
    if (!shareText) return;
    const url = window.location.origin;

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
        {encouragement && <SpeechBubble className="whitespace-pre-line">{encouragement}</SpeechBubble>}
        <VerseCard verse={verse} />
        <SongCard song={song} />
        {prayerStatus !== "idle" && (
          <PrayerTopicCard status={prayerStatus} topics={prayerTopics} onRetry={handlePrayerTopic} />
        )}
        <div className="flex flex-wrap gap-2 text-xs">
          <ActionButton onClick={onRetrySong} disabled={retriesLeft <= 0}>
            다른 곡 추천받기{retriesLeft > 0 ? ` (${retriesLeft}회 남음)` : ""}
          </ActionButton>
          {summary && prayerStatus === "idle" && (
            <ActionButton onClick={handlePrayerTopic}>기도제목으로 정리하기</ActionButton>
          )}
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
