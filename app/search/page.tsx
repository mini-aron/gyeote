import { requireMember } from "@/lib/auth/requireMember";
import { parseSearchFilters } from "@/lib/search/searchQuery";
import { getSearchOptions } from "@/lib/search/getSearchOptions";
import { searchSongs, searchVerses } from "@/lib/search/searchContent";
import { SearchView } from "@/components/search/SearchView";
import { SearchResults } from "@/components/search/SearchResults";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireMember("search");
  const filters = parseSearchFilters(await searchParams);
  const [options, verses, songs] = await Promise.all([
    getSearchOptions(filters),
    filters.type === "verse" ? searchVerses(filters) : null,
    filters.type === "song" ? searchSongs(filters) : null,
  ]);

  return (
    <SearchView filters={filters} options={options}>
      <SearchResults filters={filters} verses={verses} songs={songs} />
    </SearchView>
  );
}
