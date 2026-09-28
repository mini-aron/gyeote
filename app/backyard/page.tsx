"use client";

import { useEffect, useState } from "react";
import { BackToStartLink } from "@/components/BackToStartLink";
import { BackyardInput } from "@/components/backyard/BackyardInput";
import { useWorld } from "@/lib/world/WorldContext";

type Phase = "input" | "submitted";

export default function BackyardPage() {
  const { flyTo } = useWorld();
  const [phase, setPhase] = useState<Phase>("input");

  useEffect(() => {
    flyTo("backyard");
  }, [flyTo]);

  return (
    <main className="pointer-events-none relative flex min-h-dvh flex-1 flex-col text-[#f4f1ff]">
      {phase === "input" && <BackyardInput onFinish={() => setPhase("submitted")} />}

      {phase === "submitted" && (
        <div className="pointer-events-none flex flex-1 items-center justify-center px-6 text-center">
          {/* F-03 분석·F-04 결과는 아직 구현 전 — 다음 단계 */}
          <p className="pointer-events-auto text-sm text-[#f4f1ff]/60">
            여기까지 잘 들었어요. 분석·추천 화면은 다음 단계에서 만들 예정이에요.
          </p>
        </div>
      )}

      <div className="pointer-events-none absolute left-4 top-[calc(16px+env(safe-area-inset-top,0px))]">
        <div className="pointer-events-auto">
          <BackToStartLink />
        </div>
      </div>
    </main>
  );
}
