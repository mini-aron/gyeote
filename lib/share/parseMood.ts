import type { MoodKey } from "@/lib/world/moods";

const MOOD_KEYS: readonly MoodKey[] = ["dawn", "day", "dusk", "night"];

export const DEFAULT_SHARE_MOOD: MoodKey = "night";

export function isMoodKey(value: unknown): value is MoodKey {
  return MOOD_KEYS.some((key) => key === value);
}

export function parseMood(value: unknown): MoodKey {
  return isMoodKey(value) ? value : DEFAULT_SHARE_MOOD;
}
