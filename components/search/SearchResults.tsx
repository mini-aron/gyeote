import Link from "next/link";
import { GLASS_CARD } from "@/components/glassCard";
import { SongCard } from "@/components/church/SongCard";
import { VerseCard } from "@/components/church/VerseCard";
import { buildSearchHref, MAX_LIMIT, PAGE_SIZE, type SearchFilters } from "@/lib/search/searchQuery";
import type { SearchPage } from "@/lib/search/searchContent";
import type { SongResult, VerseResult } from "@/lib/recommend/types";

export function SearchResults({
  filters,
  verses,
  songs,
  bookmarkedIds,
}: {
  filters: SearchFilters;
  verses: SearchPage<VerseResult> | null;
  songs: SearchPage<SongResult> | null;
  bookmarkedIds: Set<string>;
}) {
  const page = verses ?? songs;
  const count = page?.items.length ?? 0;
  const total = page?.total ?? 0;

  if (count === 0) {
    return (
      <p className={`${GLASS_CARD} px-5 py-8 text-center text-sm text-[#f4f1ff]/60`}>
        조건에 맞는 {filters.type === "verse" ? "말씀" : "찬양"}이 없어요. 필터를 줄여 보세요.
      </p>
    );
  }

  return (
    <>
      <p className="px-1 text-xs text-[#f4f1ff]/55">총 {total}개</p>
      {verses?.items.map((verse) => (
        <VerseCard key={verse.id} verse={verse} bookmarked={bookmarkedIds.has(verse.id)} />
      ))}
      {songs?.items.map((song) => (
        <SongCard key={song.id} song={song} bookmarked={bookmarkedIds.has(song.id)} />
      ))}
      {total > count && filters.limit < MAX_LIMIT && (
        <Link
          href={buildSearchHref({ ...filters, limit: Math.min(filters.limit + PAGE_SIZE, MAX_LIMIT) })}
          replace
          scroll={false}
          className={`${GLASS_CARD} py-3 text-center text-sm text-[#f4f1ff]/80`}
        >
          더 보기
        </Link>
      )}
    </>
  );
}
