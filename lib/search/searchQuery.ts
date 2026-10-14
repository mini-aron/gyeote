import { isUuid } from "@/shared/lib/uuid";

export type SearchType = "verse" | "song";
export type Testament = "old" | "new";

export interface SearchFilters {
  type: SearchType;
  theme: string[];
  situation: string[];
  mood: string[];
  testament?: Testament;
  category?: string;
  book?: number;
  chapter?: number;
  q: string;
  bookmarked: boolean;
  seed?: string;
  limit: number;
}

export const PAGE_SIZE = 50;
export const MAX_LIMIT = 500;
export const MAX_QUERY_LENGTH = 50;

const SEED_PATTERN = /^[a-z0-9]{6,12}$/;

type RawParams = Record<string, string | string[] | undefined>;

function many(value: string | string[] | undefined): string[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

function uuids(value: string | string[] | undefined): string[] {
  return [...new Set(many(value).filter((id) => isUuid(id)))].slice(0, 30);
}

function int(value: string | string[] | undefined, min: number, max: number): number | undefined {
  const parsed = Number(many(value)[0]);
  return Number.isInteger(parsed) && parsed >= min && parsed <= max ? parsed : undefined;
}

export function parseSearchFilters(raw: RawParams): SearchFilters {
  const type: SearchType = raw.type === "song" ? "song" : "verse";
  const isVerse = type === "verse";
  const testament = many(raw.testament)[0];
  const category = many(raw.category)[0];
  const seed = many(raw.seed)[0];
  const validTestament = isVerse && (testament === "old" || testament === "new");
  const book = isVerse ? int(raw.book, 1, 66) : undefined;
  return {
    type,
    theme: uuids(raw.theme),
    situation: uuids(raw.situation),
    mood: isVerse ? [] : uuids(raw.mood),
    testament: validTestament ? (testament as Testament) : undefined,
    category: validTestament && category && category.length <= 20 ? category : undefined,
    book,
    chapter: book ? int(raw.chapter, 1, 200) : undefined,
    q: (many(raw.q)[0] ?? "").normalize("NFC").replace(/\s+/g, " ").trim().slice(0, MAX_QUERY_LENGTH).trim(),
    bookmarked: many(raw.bookmarked)[0] === "1",
    seed: SEED_PATTERN.test(seed ?? "") ? seed : undefined,
    limit: int(raw.limit, PAGE_SIZE, MAX_LIMIT) ?? PAGE_SIZE,
  };
}

export function buildSearchHref(filters: Partial<SearchFilters> & { type: SearchType }): string {
  const params = new URLSearchParams();
  if (filters.type === "song") params.set("type", "song");
  for (const key of ["theme", "situation", "mood"] as const) {
    for (const id of filters[key] ?? []) params.append(key, id);
  }
  if (filters.testament) params.set("testament", filters.testament);
  if (filters.category) params.set("category", filters.category);
  if (filters.book) params.set("book", String(filters.book));
  if (filters.chapter) params.set("chapter", String(filters.chapter));
  if (filters.q) params.set("q", filters.q);
  if (filters.bookmarked) params.set("bookmarked", "1");
  if (filters.seed) params.set("seed", filters.seed);
  if (filters.limit && filters.limit > PAGE_SIZE) params.set("limit", String(filters.limit));
  const query = params.toString();
  return query ? `/search?${query}` : "/search";
}

// 기본 목록의 랜덤 순서를 "더 보기"·새로고침에서도 유지하려고 URL에 싣는 시드
export function generateSeed(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return Array.from(bytes, (byte) => (byte % 36).toString(36)).join("");
}
