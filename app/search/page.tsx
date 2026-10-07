import { requireMember } from "@/lib/auth/requireMember";
import { buildSearchHref, parseSearchFilters } from "@/lib/search/searchQuery";
import { getSearchOptions } from "@/lib/search/getSearchOptions";
import { searchSongs, searchVerses } from "@/lib/search/searchContent";
import { readBookmarkedIds } from "@/lib/bookmarks/bookmarkStore";
import { SearchView } from "@/components/search/SearchView";
import { SearchResults } from "@/components/search/SearchResults";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireMember("search");
  const filters = parseSearchFilters(await searchParams);
  const bookmarkedPromise = readBookmarkedIds(filters.type);
  const searchPromise = (async () => {
    const ids = filters.bookmarked ? ((await bookmarkedPromise) ?? []) : [];
    return Promise.all([
      filters.type === "verse" ? searchVerses(filters, 0, ids) : null,
      filters.type === "song" ? searchSongs(filters, 0, ids) : null,
    ]);
  })();
  const [options, [verses, songs], bookmarkedIds] = await Promise.all([
    getSearchOptions(filters),
    searchPromise,
    bookmarkedPromise,
  ]);

  return (
    <SearchView filters={filters} options={options}>
      <SearchResults
        key={buildSearchHref(filters)}
        filters={filters}
        verses={verses}
        songs={songs}
        bookmarkedIds={bookmarkedIds ?? []}
      />
    </SearchView>
  );
}
