import type { BookmarkState } from "@/lib/bookmarks/types";
import type { SongResult } from "@/lib/recommend/types";
import { GLASS_CARD } from "@/components/glassCard";
import { BookmarkButton } from "@/components/bookmarks/BookmarkButton";

export function SongCard({
  song,
  bookmarked,
  onBeforeLogin,
}: {
  song: SongResult | null;
  bookmarked: BookmarkState;
  onBeforeLogin?: () => void;
}) {
  if (!song) {
    return (
      <div className={`${GLASS_CARD} px-5 py-4 text-sm text-[#f4f1ff]/50`}>
        지금은 어울리는 찬양을 찾지 못했어요.
      </div>
    );
  }

  // F-09 예외처리: 듣기 링크가 없으면 곡명+아티스트 유튜브 검색 링크로 대체.
  const listenHref =
    song.listenUrl ??
    `https://www.youtube.com/results?search_query=${encodeURIComponent(`${song.title} ${song.artist}`)}`;

  return (
    <div className={`${GLASS_CARD} flex items-center justify-between gap-3 px-5 py-4`}>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-[#f4f1ff]">{song.title}</p>
        <p className="text-xs text-[#f4f1ff]/50">{song.artist}</p>
      </div>
      <BookmarkButton kind="song" id={song.id} initialBookmarked={bookmarked} onBeforeLogin={onBeforeLogin} />
      <a
        href={listenHref}
        target="_blank"
        rel="noreferrer"
        className="shrink-0 rounded-xl border border-white/10 bg-white/[0.08] px-3 py-2 text-xs text-[#f4f1ff]/80"
      >
        들으러 가기
      </a>
    </div>
  );
}
