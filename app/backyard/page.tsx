"use client";

import { useEffect } from "react";
import { BackToStartLink } from "@/components/BackToStartLink";
import { useWorld } from "@/lib/world/WorldContext";

export default function BackyardPage() {
  const { flyTo } = useWorld();

  useEffect(() => {
    flyTo("backyard");
  }, [flyTo]);

  return (
    <main className="pointer-events-none relative flex min-h-dvh flex-1 items-center justify-center px-6 text-center text-[#f4f1ff]">
      <p className="pointer-events-auto text-sm text-[#f4f1ff]/60">
        뒤뜰 화면은 다음 단계에서 만들 예정이에요.
      </p>

      <div className="pointer-events-none absolute left-4 top-[calc(16px+env(safe-area-inset-top,0px))]">
        <div className="pointer-events-auto">
          <BackToStartLink />
        </div>
      </div>
    </main>
  );
}
