"use client";

import { useEffect } from "react";
import { GLASS_CARD } from "@/components/glassCard";
import { useWorld } from "@/lib/world/WorldContext";

export function MemberPlaceholder({ title }: { title: string }) {
  const { flyTo } = useWorld();

  useEffect(() => {
    flyTo("sky");
  }, [flyTo]);

  return (
    <main className="pointer-events-none flex min-h-dvh flex-1 flex-col justify-end px-4 pb-[calc(96px+env(safe-area-inset-bottom,0px))] pt-24 text-[#f4f1ff]">
      <div className={`${GLASS_CARD} pointer-events-auto mx-auto flex w-full max-w-md flex-col gap-2 px-5 py-5`}>
        <h1 className="font-serif-kr text-xl font-semibold">{title}</h1>
        <p className="text-sm text-[#f4f1ff]/60">준비 중이에요</p>
      </div>
    </main>
  );
}
