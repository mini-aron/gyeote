import { requireMember } from "@/lib/auth/requireMember";
import { getBookmarkedSongs, getBookmarkedVerses } from "@/lib/bookmarks/getBookmarkLists";
import { BookmarksView } from "@/components/bookmarks/BookmarksView";

export default async function Page() {
  await requireMember("bookmarks");
  const [verses, songs] = await Promise.all([getBookmarkedVerses(), getBookmarkedSongs()]);
  return <BookmarksView verses={verses} songs={songs} />;
}
