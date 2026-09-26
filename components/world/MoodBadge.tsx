import { MOODS, type MoodKey } from "@/lib/world/moods";

// 시간대에 따라 배경 무드가 자동으로 바뀐다는 걸 보여주는 표시 전용 뱃지.
// 선택은 못 하게 한다 — 예전 MoodSwitcher와 달리 클릭 핸들러가 없다.
export function MoodBadge({ mood }: { mood: MoodKey }) {
  return (
    <div
      role="status"
      aria-label="현재 배경 시간대"
      className="rounded-2xl border border-white/10 bg-[#120f2a]/80 px-4 py-2 text-sm text-[#f4f1ff]/80 backdrop-blur-xl"
    >
      {MOODS[mood].label}
    </div>
  );
}
