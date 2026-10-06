"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { GLASS_CARD } from "@/components/glassCard";
import { VerseCard } from "@/components/church/VerseCard";
import { useWorld } from "@/lib/world/WorldContext";
import { removeSongBookmark, removeVerseBookmark } from "@/lib/bookmarks/actions";
import type { BookmarkedSong, BookmarkedVerse } from "@/lib/bookmarks/types";

type Tab = "verse" | "song";

interface BookmarksViewProps {
  tab: Tab;
  verses: BookmarkedVerse[];
  songs: BookmarkedSong[];
}

const TABS: { key: Tab; label: string; href: string }[] = [
  { key: "verse", label: "말씀", href: "/bookmarks" },
  { key: "song", label: "찬양", href: "/bookmarks?tab=song" },
];

export function BookmarksView({ tab, verses, songs }: BookmarksViewProps) {
  const { flyTo } = useWorld();
  const [removed, setRemoved] = useState<Set<string>>(new Set());
  const [, startTransition] = useTransition();

  useEffect(() => {
    flyTo("sky");
  }, [flyTo]);

  const handleRemove = (id: string) => {
    setRemoved((prev) => new Set(prev).add(id));
    startTransition(async () => {
      const result = await (tab === "verse" ? removeVerseBookmark(id) : removeSongBookmark(id));
      if (result.error) {
        setRemoved((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }
    });
  };

  const visibleVerses = verses.filter((item) => !removed.has(item.id));
  const visibleSongs = songs.filter((item) => !removed.has(item.id));
  const isEmpty = tab === "verse" ? visibleVerses.length === 0 : visibleSongs.length === 0;

  return (
    <main className="pointer-events-none flex min-h-dvh flex-1 flex-col px-4 pb-[calc(96px+env(safe-area-inset-bottom,0px))] pt-[calc(24px+env(safe-area-inset-top,0px))] text-[#f4f1ff]">
      <div className="pointer-events-auto mx-auto flex w-full max-w-md flex-col gap-4">
        <h1 className="font-serif-kr text-xl font-semibold">북마크</h1>

        <div role="tablist" className={`${GLASS_CARD} flex p-1 text-sm`}>
          {TABS.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              role="tab"
              aria-selected={tab === item.key}
              replace
              className={`flex-1 rounded-xl py-2 text-center transition-colors ${
                tab === item.key ? "bg-white/15 text-[#f4f1ff]" : "text-[#f4f1ff]/60"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </div>

        {isEmpty && (
          <p className={`${GLASS_CARD} px-5 py-8 text-center text-sm text-[#f4f1ff]/60`}>
            {tab === "verse"
              ? "아직 저장한 말씀이 없어요. 마음에 남는 말씀에서 책갈피를 눌러 보세요."
              : "아직 저장한 찬양이 없어요. 마음에 남는 찬양에서 책갈피를 눌러 보세요."}
          </p>
        )}

        {tab === "verse" &&
          visibleVerses.map((verse) =>
            verse.isActive ? (
              <VerseCard key={verse.id} verse={verse} bookmarked collapsed />
            ) : (
              <article key={verse.id} className={`${GLASS_CARD} px-5 py-4 opacity-60`}>
                <div className="flex items-start justify-between gap-3">
                  <p className="text-xs tracking-wide text-[#f4f1ff]/65">
                    {verse.reference} · {verse.translation}
                  </p>
                  <RemoveButton onClick={() => handleRemove(verse.id)} />
                </div>
                <p className="mt-2 text-sm text-[#f4f1ff]/60">더 이상 제공되지 않아요</p>
              </article>
            ),
          )}

        {tab === "song" &&
          visibleSongs.map((song) => (
            <article key={song.id} className={`${GLASS_CARD} px-5 py-4 ${song.isActive ? "" : "opacity-60"}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium">{song.title}</p>
                  <p className="text-xs text-[#f4f1ff]/50">{song.artist}</p>
                </div>
                <RemoveButton onClick={() => handleRemove(song.id)} />
              </div>
              {song.isActive ? (
                <a
                  href={
                    song.listenUrl ??
                    `https://www.youtube.com/results?search_query=${encodeURIComponent(`${song.title} ${song.artist}`)}`
                  }
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-block rounded-xl border border-white/10 bg-white/[0.08] px-3 py-2 text-xs text-[#f4f1ff]/80"
                >
                  들으러 가기
                </a>
              ) : (
                <p className="mt-2 text-sm text-[#f4f1ff]/60">더 이상 제공되지 않아요</p>
              )}
            </article>
          ))}
      </div>
    </main>
  );
}

function RemoveButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="북마크 해제"
      className="-m-2 shrink-0 rounded-full p-2 text-[#c9bcff] hover:bg-white/10"
    >
      <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" aria-hidden="true">
        <path d="M6 3.5h12a.5.5 0 0 1 .5.5v17l-6.5-4.5L5.5 21V4a.5.5 0 0 1 .5-.5Z" />
      </svg>
    </button>
  );
}
