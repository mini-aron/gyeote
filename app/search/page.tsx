import { requireMember } from "@/lib/auth/requireMember";
import { buildSearchHref, generateSeed, parseSearchFilters } from "@/lib/search/searchQuery";
import { getSearchOptions } from "@/lib/search/getSearchOptions";
import { findRelaxations, searchSongs, searchVerses } from "@/lib/search/searchContent";
import { readBookmarkedIds } from "@/lib/bookmarks/bookmarkStore";
import { SearchView } from "@/components/search/SearchView";
import { SearchResults } from "@/components/search/SearchResults";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireMember("search");
  const parsed = parseSearchFilters(await searchParams);
  // redirect하면 진입마다 왕복이 두 번이라, 여기서 만든 시드로 바로 렌더하고 URL 반영은 SearchResults가 한다.
  const filters = parsed.seed ? parsed : { ...parsed, seed: generateSeed() };
  const bookmarkedPromise = readBookmarkedIds(filters.type);
  const searchPromise = (async () => {
    const ids = filters.bookmark ? ((await bookmarkedPromise) ?? []) : [];
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
  const total = (verses ?? songs)?.total ?? 0;
  const suggestions = total === 0 ? await findRelaxations(filters, bookmarkedIds ?? []) : [];

  return (
    <SearchView filters={filters} options={options}>
      <SearchResults
        key={buildSearchHref(filters)}
        filters={filters}
        verses={verses}
        songs={songs}
        bookmarkedIds={bookmarkedIds ?? []}
        suggestions={suggestions}
      />
    </SearchView>
  );
}
