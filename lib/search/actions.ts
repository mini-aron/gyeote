"use server";

import { getCurrentUser } from "@/shared/lib/auth";
import { hasRequiredConsents } from "@/lib/auth/consentStatus";
import { MAX_LIMIT, PAGE_SIZE, parseSearchFilters } from "@/lib/search/searchQuery";
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
    const [verses, songs] = await Promise.all([
      filters.type === "verse" ? searchVerses(filters, offset) : null,
      filters.type === "song" ? searchSongs(filters, offset) : null,
    ]);
    return { ok: true, verses, songs };
  } catch {
    return { ok: false, error: "failed" };
  }
}
