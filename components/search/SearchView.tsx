"use client";

import { useEffect } from "react";
import Link from "next/link";
import { GLASS_CARD } from "@/components/glassCard";
import { SearchFilterPanel } from "@/components/search/SearchFilterPanel";
import { useWorld } from "@/lib/world/WorldContext";
import { buildSearchHref, type SearchFilters } from "@/lib/search/searchQuery";
import type { SearchOptions } from "@/lib/search/types";

const TABS = [
  { key: "verse", label: "말씀" },
  { key: "song", label: "찬양" },
] as const;

export function SearchView({
  filters,
  options,
  children,
}: {
  filters: SearchFilters;
  options: SearchOptions;
  children: React.ReactNode;
}) {
  const { flyTo } = useWorld();

  useEffect(() => {
    flyTo("sky");
  }, [flyTo]);

  return (
    <main className="pointer-events-none flex min-h-dvh flex-1 flex-col px-4 pb-[calc(96px+env(safe-area-inset-bottom,0px))] pt-[calc(24px+env(safe-area-inset-top,0px))] text-[#f4f1ff]">
      <div className="pointer-events-auto mx-auto flex w-full max-w-md flex-col gap-4">
        <h1 className="font-serif-kr text-xl font-semibold">검색</h1>

        <div role="tablist" className={`${GLASS_CARD} flex p-1 text-sm`}>
          {TABS.map((tab) => (
            <Link
              key={tab.key}
              href={buildSearchHref({ type: tab.key })}
              role="tab"
              aria-selected={filters.type === tab.key}
              replace
              scroll={false}
              className={`flex-1 rounded-xl py-2 text-center transition-colors ${
                filters.type === tab.key ? "bg-white/15 text-[#f4f1ff]" : "text-[#f4f1ff]/60"
              }`}
            >
              {tab.label}
            </Link>
          ))}
        </div>

        <SearchFilterPanel filters={filters} options={options} />

        {children}
      </div>
    </main>
  );
}
