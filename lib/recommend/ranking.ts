import type { ConversationTags } from "@/lib/analysis/types";

interface VerseTags {
  themes: string[];
  situations: string[];
}

export function shuffle<T>(items: readonly T[], random: () => number = Math.random): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// 시간대는 같은 주제 수 안에서 순서만 가르도록 주제 하나보다 가볍게 둔다.
export function scoreVerse(verse: VerseTags, tags: ConversationTags): number {
  const themeHits = verse.themes.filter((theme) => tags.themes.includes(theme)).length;
  return themeHits * 2 + (verse.situations.includes(tags.situation) ? 1 : 0);
}

// 동점끼리 DB 순서가 그대로 남지 않도록 섞은 뒤 정렬한다 (sort는 안정 정렬).
export function rankVerseCandidates<T extends VerseTags>(
  pool: readonly T[],
  tags: ConversationTags,
  limit: number,
  random: () => number = Math.random,
): T[] {
  return shuffle(pool, random)
    .map((item) => ({ item, score: scoreVerse(item, tags) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((entry) => entry.item);
}

export function parseVersePick(raw: string, candidateCount: number): number {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  const parsed: unknown = JSON.parse(fenced ? fenced[1] : trimmed);
  const pick = typeof parsed === "object" && parsed !== null ? (parsed as { pick?: unknown }).pick : undefined;
  if (typeof pick !== "number" || !Number.isInteger(pick) || pick < 1 || pick > candidateCount) {
    throw new Error(`말씀 선택 응답이 후보 범위를 벗어났습니다: ${trimmed}`);
  }
  return pick - 1;
}
