import { MOOD_OPTIONS, SITUATION_OPTIONS, THEME_OPTIONS } from "@/lib/analysis/tagVocabulary";

export const MAX_FEELING_LENGTH = 300;
const MAX_THEMES = 3;
const MAX_MOODS = 2;

export interface FeelingTags {
  themes: string[];
  moods: string[];
  situation: string | null;
  crisis: boolean;
}

function pickFrom(value: unknown, allowed: readonly string[], max: number): string[] {
  if (!Array.isArray(value)) return [];
  const picked = value.filter((item): item is string => typeof item === "string" && allowed.includes(item));
  return [...new Set(picked)].slice(0, max);
}

export function parseFeelingTags(raw: string): FeelingTags {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  const parsed: unknown = JSON.parse(fenced ? fenced[1] : trimmed);
  if (typeof parsed !== "object" || parsed === null) throw new Error("태그 응답 형식이 올바르지 않습니다.");
  const record = parsed as Record<string, unknown>;
  // 위기 문장에서는 AI가 주제를 비우는 경우가 있어, 주제 검사보다 먼저 봐야 안내가 실패로 빠지지 않는다.
  if (record.crisis === true) return { themes: [], moods: [], situation: null, crisis: true };

  const themes = pickFrom(record.themes, THEME_OPTIONS, MAX_THEMES);
  if (themes.length === 0) throw new Error("주제 태그가 없습니다.");
  const situation =
    typeof record.situation === "string" && (SITUATION_OPTIONS as readonly string[]).includes(record.situation)
      ? record.situation
      : null;

  return {
    themes,
    moods: pickFrom(record.moods, MOOD_OPTIONS, MAX_MOODS),
    situation,
    crisis: record.crisis === true,
  };
}
