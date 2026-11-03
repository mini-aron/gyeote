import { notFound } from "next/navigation";
import { requireMember } from "@/lib/auth/requireMember";
import { isBookmarkedBy } from "@/lib/bookmarks/bookmarkStore";
import { canViewLyrics, getSongLyrics } from "@/lib/lyrics/lyricsAccess";
import { getSongDetail } from "@/lib/songs/getSongDetail";
import { SongDetailView } from "@/components/songs/SongDetailView";

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const user = await requireMember("search", `/songs/${id}`);
  const [song, bookmarked, lyricsAllowed, { from }] = await Promise.all([
    getSongDetail(id),
    isBookmarkedBy(user.id, "song", id),
    canViewLyrics(user.id),
    searchParams,
  ]);
  if (!song) notFound();
  // 권한이 없으면 가사를 조회조차 하지 않아 클라이언트로 내려가지 않는다
  const lyrics = lyricsAllowed ? { text: await getSongLyrics(song.id) } : null;
  return (
    <SongDetailView
      song={song}
      bookmarked={bookmarked}
      lyrics={lyrics}
      canGoBack={from === "search" || from === "bookmarks"}
    />
  );
}
