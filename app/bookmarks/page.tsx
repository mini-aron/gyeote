import { requireMember } from "@/lib/auth/requireMember";
import { getBookmarkedSongs, getBookmarkedVerses } from "@/lib/bookmarks/getBookmarkLists";
import { BookmarksView } from "@/components/bookmarks/BookmarksView";

export default async function Page({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  await requireMember("bookmarks");
  const { tab } = await searchParams;
  const activeTab = tab === "song" ? "song" : "verse";
  const [verses, songs] = await Promise.all([
    activeTab === "verse" ? getBookmarkedVerses() : [],
    activeTab === "song" ? getBookmarkedSongs() : [],
  ]);
  return <BookmarksView tab={activeTab} verses={verses} songs={songs} />;
}
