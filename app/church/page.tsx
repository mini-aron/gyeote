"use client";

import { useEffect, useState } from "react";
import { MoodSwitcher } from "@/components/world/MoodSwitcher";
import { useWorld } from "@/lib/world/WorldContext";
import type { MoodKey } from "@/lib/world/moods";

export default function ChurchPage() {
  const [mood, setMoodState] = useState<MoodKey>("night");
  const { flyTo, setMood } = useWorld();

  useEffect(() => {
    flyTo("church");
  }, [flyTo]);

  useEffect(() => {
    setMood(mood);
  }, [mood, setMood]);

  return (
    <main className="pointer-events-none relative flex min-h-dvh flex-1 flex-col text-[#f4f1ff]">
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center px-4 pb-[calc(16px+env(safe-area-inset-bottom,0px))]">
        <div className="pointer-events-auto">
          <MoodSwitcher mood={mood} onChange={setMoodState} />
        </div>
      </div>
    </main>
  );
}
