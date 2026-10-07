"use client";

import { useEffect } from "react";
import { SearchFilterPanel } from "@/components/search/SearchFilterPanel";
import { useWorld } from "@/lib/world/WorldContext";
import type { SearchFilters } from "@/lib/search/searchQuery";
import type { SearchOptions } from "@/lib/search/types";

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

        <SearchFilterPanel filters={filters} options={options} />

        {children}
      </div>
    </main>
  );
}
