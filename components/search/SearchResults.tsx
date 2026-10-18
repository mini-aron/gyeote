"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { GLASS_CARD } from "@/components/glassCard";
import { SongCard } from "@/components/church/SongCard";
import { VerseCard } from "@/components/church/VerseCard";
import { loadMoreSearch } from "@/lib/search/actions";
import { buildSearchHref, MAX_LIMIT, PAGE_SIZE, type SearchFilters } from "@/lib/search/searchQuery";
import type { RelaxSuggestion, SearchPage } from "@/lib/search/searchContent";
import type { SongResult, VerseResult } from "@/lib/recommend/types";

function normalizedQuery(search: string): string {
  const params = new URLSearchParams(search);
  params.delete("limit");
  params.sort();
  return params.toString();
}

function appendUnique<T extends { id: string }>(current: T[], next: T[]): T[] {
  const seen = new Set(current.map((item) => item.id));
  return [...current, ...next.filter((item) => !seen.has(item.id))];
}

function emptyMessage(filters: SearchFilters): string {
  const noun = filters.type === "verse" ? "말씀" : "찬양";
  if (filters.bookmark === "only") return `북마크한 ${noun} 중 조건에 맞는 ${noun}이 없어요.`;
  if (filters.bookmark === "exclude") return `북마크하지 않은 ${noun} 중 조건에 맞는 ${noun}이 없어요.`;
  return `조건에 맞는 ${noun}이 없어요.`;
}

export function SearchResults({
  filters,
  verses,
  songs,
  bookmarkedIds,
  suggestions,
}: {
  filters: SearchFilters;
  verses: SearchPage<VerseResult> | null;
  songs: SearchPage<SongResult> | null;
  bookmarkedIds: string[];
  suggestions: RelaxSuggestion[];
}) {
  const bookmarked = useMemo(() => new Set(bookmarkedIds), [bookmarkedIds]);
  const [verseItems, setVerseItems] = useState(verses?.items ?? []);
  const [songItems, setSongItems] = useState(songs?.items ?? []);
  const [total, setTotal] = useState((verses ?? songs)?.total ?? 0);
  const matchedReference = verses?.matchedReference;
  const [failed, setFailed] = useState(false);
  const [pending, startTransition] = useTransition();
  const [announcement, setAnnouncement] = useState("");
  const inFlight = useRef(false);
  const alive = useRef(false);
  const statusRef = useRef<HTMLParagraphElement>(null);
  const router = useRouter();

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  // 하이드레이션 커밋에서는 자식 effect가 Next 라우터의 replaceState 연동보다 먼저 돌 수 있어 한 틱 미룬다.
  useEffect(() => {
    const id = setTimeout(() => {
      if (window.location.pathname !== "/search") return;
      if (new URLSearchParams(window.location.search).get("seed") === filters.seed) return;
      window.history.replaceState(null, "", buildSearchHref(filters));
    }, 0);
    return () => clearTimeout(id);
  }, [filters]);

  const count = verseItems.length + songItems.length;

  if (count === 0) {
    return (
      <div className={`${GLASS_CARD} flex flex-col items-center gap-4 px-5 py-8 text-center`}>
        <p className="text-sm text-[#f4f1ff]/60">
          {matchedReference ? `${matchedReference}에 ` : ""}
          {emptyMessage(filters)}
          {suggestions.length === 0 && " 필터를 줄여 보세요."}
        </p>
        {suggestions.length > 0 && (
          <div className="flex flex-col items-center gap-2">
            <p className="text-xs text-[#f4f1ff]/50">이렇게 찾으면 있어요</p>
            <div className="flex flex-wrap justify-center gap-1.5">
              {suggestions.map((suggestion) => (
                <Link
                  key={suggestion.href}
                  href={suggestion.href}
                  replace
                  scroll={false}
                  className="rounded-full border border-[#c9bcff]/40 bg-[#c9bcff]/15 px-3 py-1.5 text-xs text-[#f4f1ff]"
                >
                  {suggestion.label} · {suggestion.count}개
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  const loadMore = () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setFailed(false);
    const baseHref = buildSearchHref({ ...filters, limit: undefined });
    const baseQuery = baseHref.split("?")[1] ?? "";
    startTransition(async () => {
      try {
        const result = await loadMoreSearch(baseQuery, count);
        if (!alive.current) return;
        if (!result.ok) {
          if (result.error === "unauthorized" || result.error === "consent") {
            router.replace(buildSearchHref({ ...filters, limit: Math.min(count + PAGE_SIZE, MAX_LIMIT) }));
          } else {
            setFailed(true);
          }
          return;
        }
        const nextVerses = appendUnique(verseItems, result.verses?.items ?? []);
        const nextSongs = appendUnique(songItems, result.songs?.items ?? []);
        const nextCount = nextVerses.length + nextSongs.length;
        const nextTotal = (result.verses ?? result.songs)?.total ?? total;
        setVerseItems(nextVerses);
        setSongItems(nextSongs);
        setTotal(nextTotal);
        setAnnouncement(`${nextCount - count}개 더 불러왔어요`);
        if (window.location.pathname === "/search" && normalizedQuery(window.location.search) === normalizedQuery(baseQuery)) {
          window.history.replaceState(null, "", buildSearchHref({ ...filters, limit: nextCount }));
        }
        // 버튼이 사라지면 포커스가 body로 떨어지므로 상태 줄로 옮긴다.
        if (nextCount >= nextTotal || nextCount >= MAX_LIMIT) {
          requestAnimationFrame(() => statusRef.current?.focus({ preventScroll: true }));
        }
      } catch {
        if (alive.current) setFailed(true);
      } finally {
        inFlight.current = false;
      }
    });
  };

  return (
    <>
      <p
        ref={statusRef}
        tabIndex={-1}
        aria-live="polite"
        className="px-1 text-xs text-[#f4f1ff]/55 outline-none"
      >
        {matchedReference && `'${matchedReference}' 구절로 찾았어요 · `}총 {total}개<span className="sr-only"> {announcement}</span>
      </p>
      {verseItems.map((verse) => (
        <VerseCard key={verse.id} verse={verse} bookmarked={bookmarked.has(verse.id)} />
      ))}
      {songItems.map((song) => (
        <SongCard key={song.id} song={song} bookmarked={bookmarked.has(song.id)} detailHref={`/songs/${song.id}?from=search`} />
      ))}
      {total > count && count < MAX_LIMIT && (
        <button
          type="button"
          onClick={loadMore}
          disabled={pending}
          className={`${GLASS_CARD} py-3 text-center text-sm text-[#f4f1ff]/80 disabled:opacity-60`}
        >
          {pending ? "불러오는 중..." : failed ? "불러오지 못했어요. 다시 시도" : "더 보기"}
        </button>
      )}
    </>
  );
}
