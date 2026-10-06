import type { TimeBand } from "@/lib/greeting";

const ICON_PROPS = {
  width: 22,
  height: 22,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
} as const;

const SUN_RAYS = "M12 3v1.5M12 19.5V21M3 12h1.5M19.5 12H21M5.6 5.6l1.1 1.1M17.3 17.3l1.1 1.1M5.6 18.4l1.1-1.1M17.3 6.7l1.1-1.1";

const ICONS: Record<TimeBand, React.ReactNode> = {
  dawn: (
    <svg {...ICON_PROPS}>
      <path d="M3 18h18M7 18a5 5 0 0 1 10 0" />
      <path d="M12 5v5M9.5 7.5 12 5l2.5 2.5" />
    </svg>
  ),
  morning: (
    <svg {...ICON_PROPS}>
      <circle cx="12" cy="12" r="4" />
      <path d={SUN_RAYS} />
    </svg>
  ),
  afternoon: (
    <svg {...ICON_PROPS}>
      <path d="M8.5 4.5v1M3.5 9.5h1M5 6l.7.7M12 6l-.7.7" />
      <path d="M5.6 11.6A3.5 3.5 0 1 1 11.8 8" />
      <path d="M8.5 19h9a3.5 3.5 0 0 0 .4-7 5 5 0 0 0-9.6 1.4A2.8 2.8 0 0 0 8.5 19Z" />
    </svg>
  ),
  evening: (
    <svg {...ICON_PROPS}>
      <path d="M3 18h18M7 18a5 5 0 0 1 10 0" />
      <path d="M12 4v5M9.5 6.5 12 9l2.5-2.5" />
    </svg>
  ),
  night: (
    <svg {...ICON_PROPS}>
      <path d="M19.5 14.5A7.5 7.5 0 1 1 9.5 4.5a6 6 0 0 0 10 10Z" />
    </svg>
  ),
};

const LABELS: Record<TimeBand, string> = {
  dawn: "새벽",
  morning: "아침",
  afternoon: "낮",
  evening: "저녁",
  night: "밤",
};

export function TimeBandIcon({ band }: { band: TimeBand }) {
  return (
    <span
      role="img"
      aria-label={LABELS[band]}
      className={`flex size-9 shrink-0 items-center justify-center rounded-full bg-white/10 ${
        band === "night" ? "text-[#c9bcff]" : "text-[#ffd9a8]"
      }`}
    >
      {ICONS[band]}
    </span>
  );
}
