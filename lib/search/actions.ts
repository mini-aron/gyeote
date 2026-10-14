"use server";

import { getCurrentUser } from "@/shared/lib/auth";
import { hasRequiredConsents } from "@/lib/auth/consentStatus";
import { buildSearchHref, MAX_LIMIT, PAGE_SIZE, parseSearchFilters } from "@/lib/search/searchQuery";
import { detectCrisisSignal } from "@/lib/analysis/crisisSignal";
import { getTagOptions } from "@/lib/catalog/catalogCache";
import { interpretFeeling } from "@/lib/search/interpretFeeling";
import { MAX_FEELING_LENGTH } from "@/lib/search/feelingTags";
import type { TagOption } from "@/lib/search/types";
import { readBookmarkedIds } from "@/lib/bookmarks/bookmarkStore";
import { searchSongs, searchVerses, type SearchPage } from "@/lib/search/searchContent";
import type { SongResult, VerseResult } from "@/lib/recommend/types";

export type LoadMoreResult =
  | { ok: true; verses: SearchPage<VerseResult> | null; songs: SearchPage<SongResult> | null }
  | { ok: false; error: "unauthorized" | "consent" | "invalid" | "failed" };

export async function loadMoreSearch(query: unknown, offset: unknown): Promise<LoadMoreResult> {
  if (typeof query !== "string" || query.length > 2000) return { ok: false, error: "invalid" };
  if (typeof offset !== "number" || !Number.isInteger(offset) || offset < 0 || offset >= MAX_LIMIT) {
    return { ok: false, error: "invalid" };
  }

  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "unauthorized" };
  if (!(await hasRequiredConsents(user.id))) return { ok: false, error: "consent" };

  const params = new URLSearchParams(query);
  const raw: Record<string, string[]> = {};
  for (const key of new Set(params.keys())) raw[key] = params.getAll(key);
  const filters = { ...parseSearchFilters(raw), limit: Math.min(PAGE_SIZE, MAX_LIMIT - offset) };

  try {
    const bookmarkedIds = filters.bookmarked ? ((await readBookmarkedIds(filters.type)) ?? []) : [];
    const [verses, songs] = await Promise.all([
      filters.type === "verse" ? searchVerses(filters, offset, bookmarkedIds) : null,
      filters.type === "song" ? searchSongs(filters, offset, bookmarkedIds) : null,
    ]);
    return { ok: true, verses, songs };
  } catch {
    return { ok: false, error: "failed" };
  }
}

export type FeelingSearchResult =
  | { ok: true; href: string }
  | { ok: false; error: "unauthorized" | "consent" | "invalid" | "crisis" | "failed" };

function idsOf(names: string[], options: TagOption[]): string[] {
  return names.flatMap((name) => options.find((option) => option.name === name)?.id ?? []);
}

// 적은 글은 민감한 내용이라 URL·로그에 남기지 않고, 태그로 바꾼 검색 주소만 돌려준다.
export async function searchByFeeling(text: unknown, type: unknown): Promise<FeelingSearchResult> {
  if (typeof text !== "string" || (type !== "verse" && type !== "song")) return { ok: false, error: "invalid" };
  const feeling = text.normalize("NFC").trim();
  if (feeling.length < 2 || feeling.length > MAX_FEELING_LENGTH) return { ok: false, error: "invalid" };

  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "unauthorized" };
  if (!(await hasRequiredConsents(user.id))) return { ok: false, error: "consent" };

  // AI가 꺼져 있거나 느려도 위기 안내는 반드시 나가야 해서 AI 호출 전에 검사한다.
  if (detectCrisisSignal(feeling)) return { ok: false, error: "crisis" };

  try {
    // 카탈로그 조회가 실패해도 AI의 위기 판정은 먼저 반영되도록 따로 기다린다.
    const interpreted = interpretFeeling(feeling);
    const catalog = Promise.all([getTagOptions("themes"), getTagOptions("situations"), getTagOptions("moods")]);
    catalog.catch(() => {});
    const tags = await interpreted;
    if (tags.crisis) return { ok: false, error: "crisis" };

    const [themes, situations, moods] = await catalog;
    const theme = idsOf(tags.themes, themes);
    const situation = tags.situation ? idsOf([tags.situation], situations) : [];
    const mood = type === "song" ? idsOf(tags.moods, moods) : [];
    // 태그가 하나도 안 잡히면 match=any만 남아 전체 랜덤 목록이 "마음 검색 결과"처럼 보인다.
    if (theme.length + situation.length + mood.length === 0) return { ok: false, error: "failed" };
    return { ok: true, href: buildSearchHref({ type, theme, situation, mood, matchAny: true }) };
  } catch {
    return { ok: false, error: "failed" };
  }
}
