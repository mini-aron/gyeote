import { notFound } from "next/navigation";
import { requireMember } from "@/lib/auth/requireMember";
import { isBookmarkedBy } from "@/lib/bookmarks/bookmarkStore";
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
  const [song, bookmarked, { from }] = await Promise.all([
    getSongDetail(id),
    isBookmarkedBy(user.id, "song", id),
    searchParams,
  ]);
  if (!song) notFound();
  return <SongDetailView song={song} bookmarked={bookmarked} canGoBack={from === "search" || from === "bookmarks"} />;
}
