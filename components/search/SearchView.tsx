"use client";

import { useEffect, useState } from "react";
import { CrisisNotice } from "@/components/CrisisNotice";
import { FeelingSearch } from "@/components/search/FeelingSearch";
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
  const [crisis, setCrisis] = useState(false);

  useEffect(() => {
    flyTo("sky");
  }, [flyTo]);

  if (crisis) {
    return (
      <main className="pointer-events-none flex min-h-dvh flex-1 flex-col">
        <CrisisNotice onRestart={() => setCrisis(false)} />
      </main>
    );
  }

  return (
    <main className="pointer-events-none flex min-h-dvh flex-1 flex-col px-4 pb-[calc(96px+env(safe-area-inset-bottom,0px))] pt-[calc(24px+env(safe-area-inset-top,0px))] text-[#f4f1ff]">
      <div className="pointer-events-auto mx-auto flex w-full max-w-md flex-col gap-4">
        <h1 className="font-serif-kr text-xl font-semibold">검색</h1>

        <FeelingSearch type={filters.type} onCrisis={() => setCrisis(true)} />

        <SearchFilterPanel filters={filters} options={options} />

        {children}
      </div>
    </main>
  );
}
