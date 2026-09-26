"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { MoodSwitcher } from "@/components/church/MoodSwitcher";
import type { MoodKey } from "@/lib/church/moods";

// three.js only loads when someone actually visits /church.
const ChurchBackground = dynamic(
  () => import("@/components/church/ChurchBackground").then((m) => m.ChurchBackground),
  { ssr: false },
);

export default function ChurchPage() {
  const [mood, setMood] = useState<MoodKey>("night");

  return (
    <main className="relative min-h-dvh overflow-hidden bg-[#0d0b1a] text-[#f4f1ff]">
      <ChurchBackground mood={mood} />

      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center px-4 pb-[calc(16px+env(safe-area-inset-bottom,0px))]">
        <div className="pointer-events-auto">
          <MoodSwitcher mood={mood} onChange={setMood} />
        </div>
      </div>
    </main>
  );
}
