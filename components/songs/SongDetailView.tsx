"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { GLASS_CARD } from "@/components/glassCard";
import { BookmarkButton } from "@/components/bookmarks/BookmarkButton";
import { YoutubePreview } from "@/components/songs/YoutubePreview";
import { useWorld } from "@/lib/world/WorldContext";
import type { SongDetail } from "@/lib/songs/getSongDetail";

const SEARCH_FALLBACK_HREF = "/search?type=song";

export function SongDetailView({
  song,
  bookmarked,
  canGoBack,
}: {
  song: SongDetail;
  bookmarked: boolean;
  canGoBack: boolean;
}) {
  const { flyTo } = useWorld();
  const router = useRouter();

  useEffect(() => {
    flyTo("sky");
  }, [flyTo]);

  const youtubeHref = song.youtubeVideoId
    ? `https://www.youtube.com/watch?v=${song.youtubeVideoId}`
    : `https://www.youtube.com/results?search_query=${encodeURIComponent(`${song.title} ${song.artist}`)}`;

  return (
    <main className="pointer-events-none flex min-h-dvh flex-1 flex-col px-4 pb-[calc(96px+env(safe-area-inset-bottom,0px))] pt-[calc(24px+env(safe-area-inset-top,0px))] text-[#f4f1ff]">
      <div className="pointer-events-auto mx-auto flex w-full max-w-md flex-col gap-4">
        <div className="flex items-center gap-2">
          {/* 목록에서 왔으면 뒤로 가야 필터·불러온 목록·스크롤 위치가 그대로 남는다 */}
          <button
            type="button"
            onClick={() => (canGoBack ? router.back() : router.push(SEARCH_FALLBACK_HREF))}
            aria-label="뒤로"
            className="-ml-2 rounded-full px-2 py-1 text-xl hover:bg-white/10"
          >
            ‹
          </button>
          <p className="text-sm text-[#f4f1ff]/65">찬양</p>
        </div>

        <section className={`${GLASS_CARD} flex flex-col gap-4 px-5 py-5`}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h1 className="font-serif-kr text-xl font-semibold leading-snug">{song.title}</h1>
              <p className="mt-1 text-sm text-[#f4f1ff]/60">{song.artist}</p>
            </div>
            <BookmarkButton kind="song" id={song.id} initialBookmarked={bookmarked} />
          </div>

          {song.youtubeVideoId && <YoutubePreview videoId={song.youtubeVideoId} title={song.title} />}

          {song.summary && <p className="text-sm leading-relaxed text-[#f4f1ff]/85">{song.summary}</p>}

          {song.tags.length > 0 && (
            <ul className="flex flex-wrap gap-1.5" aria-label="태그">
              {song.tags.map((tag) => (
                <li
                  key={tag}
                  className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-xs text-[#f4f1ff]/75"
                >
                  {tag}
                </li>
              ))}
            </ul>
          )}

          <div className="flex gap-2">
            <a
              href={youtubeHref}
              target="_blank"
              rel="noreferrer"
              className="flex-1 rounded-xl border border-white/10 bg-white/[0.08] px-3 py-2.5 text-center text-sm text-[#f4f1ff]/85"
            >
              유튜브에서 보기
            </a>
            {song.listenUrl && (
              <a
                href={song.listenUrl}
                target="_blank"
                rel="noreferrer"
                className="flex-1 rounded-xl border border-white/10 bg-white/[0.08] px-3 py-2.5 text-center text-sm text-[#f4f1ff]/85"
              >
                음원 듣기
              </a>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
