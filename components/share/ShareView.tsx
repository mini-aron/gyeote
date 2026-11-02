"use client";

import { useEffect } from "react";
import Link from "next/link";
import { SongCard } from "@/components/church/SongCard";
import { VerseCard } from "@/components/church/VerseCard";
import { useBookmarkStatus } from "@/components/bookmarks/useBookmarkStatus";
import { getTimeBand } from "@/lib/greeting";
import { useWorld } from "@/lib/world/WorldContext";
import { getMoodForTimeBand, type MoodKey } from "@/lib/world/moods";
import type { ShareContent } from "@/lib/share/getShareContent";

export function ShareView({ content, mood }: { content: ShareContent; mood: MoodKey }) {
  const { flyTo, setMood } = useWorld();
  const { verse, song } = content;
  const bookmarkStatus = useBookmarkStatus(verse.id, song?.id);

  // 이 화면에서 정한 공유 무드가 다른 화면에 남지 않도록 떠날 때 현재 시각의 무드로 되돌린다.
  useEffect(() => {
    flyTo("sky");
    setMood(mood);
    return () => setMood(getMoodForTimeBand(getTimeBand(new Date())));
  }, [flyTo, setMood, mood]);

  return (
    <div className="pointer-events-none flex flex-1 flex-col justify-end px-4 pb-[calc(96px+env(safe-area-inset-bottom,0px))] pt-24">
      <div className="pointer-events-auto flex flex-col gap-4">
        <VerseCard verse={{ ...verse, meaning: null, application: null }} bookmarked={bookmarkStatus.verse} collapsed />
        {song && <SongCard song={{ ...song, listenUrl: null }} bookmarked={bookmarkStatus.song} />}
        <Link
          href="/"
          className="rounded-2xl border border-white/10 bg-white/[0.12] px-4 py-3 text-center text-sm text-[#f4f1ff] backdrop-blur-md transition-colors hover:bg-white/[0.18]"
        >
          나도 지금 마음 이야기하기
        </Link>
      </div>
    </div>
  );
}
