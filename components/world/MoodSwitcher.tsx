"use client";

import { MOODS, type MoodKey } from "@/lib/world/moods";

const MOOD_ORDER: MoodKey[] = ["dawn", "day", "dusk", "night"];

export function MoodSwitcher({
  mood,
  onChange,
}: {
  mood: MoodKey;
  onChange: (mood: MoodKey) => void;
}) {
  return (
    <div
      role="group"
      aria-label="배경 설정"
      className="flex items-center gap-1 rounded-2xl border border-white/10 bg-[#120f2a]/80 p-1.5 backdrop-blur-xl"
    >
      {MOOD_ORDER.map((key) => (
        <button
          key={key}
          type="button"
          aria-pressed={mood === key}
          onClick={() => onChange(key)}
          className={`rounded-xl px-3 py-2 text-sm transition-colors ${
            mood === key
              ? "bg-[#ffd9a8]/15 text-[#ffd9a8]"
              : "text-[#f4f1ff]/70 hover:bg-white/[0.08] hover:text-[#f4f1ff]"
          }`}
        >
          {MOODS[key].label}
        </button>
      ))}
    </div>
  );
}
