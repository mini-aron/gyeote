import { describe, expect, it } from "vitest";
import { buildSearchHref, generateSeed, normalizeQuery, parseSearchFilters } from "./searchQuery";

function roundTrip(href: string) {
  const params = new URLSearchParams(href.split("?")[1] ?? "");
  const raw: Record<string, string[]> = {};
  for (const key of new Set(params.keys())) raw[key] = params.getAll(key);
  return parseSearchFilters(raw);
}

describe("parseSearchFilters", () => {
  it("말씀에서도 키워드를 유지하고 NFC·공백을 정리한다", () => {
    const filters = parseSearchFilters({ q: "  시편   23 ".normalize("NFD") });
    expect(filters.type).toBe("verse");
    expect(filters.q).toBe("시편 23");
  });

  it("50자로 자른 끝이 공백이어도 왕복이 유지된다", () => {
    const filters = parseSearchFilters({ q: `${"가".repeat(49)} 나` });
    expect(filters.q).toBe("가".repeat(49));
    expect(roundTrip(buildSearchHref(filters))).toEqual(filters);
  });

  it.each(["abc", "ABCDEF12", "abc-def", "a".repeat(13)])("형식이 틀린 시드는 버린다: %s", (seed) => {
    expect(parseSearchFilters({ seed }).seed).toBeUndefined();
  });

  it("시드와 말씀 키워드가 URL을 거쳐 그대로 돌아온다", () => {
    const filters = parseSearchFilters({ q: "두려워", seed: "k3x9q2ab", theme: [] });
    expect(roundTrip(buildSearchHref(filters))).toEqual(filters);
  });
});

describe("matchAny", () => {
  it("match=any만 켜지고 URL 왕복이 유지된다", () => {
    expect(parseSearchFilters({ match: "all" }).matchAny).toBe(false);
    const filters = parseSearchFilters({ match: "any", theme: ["00000000-0000-4000-8000-000000000001"] });
    expect(filters.matchAny).toBe(true);
    expect(roundTrip(buildSearchHref(filters))).toEqual(filters);
  });
});

describe("bookmark", () => {
  it("1은 북마크한 것만, 0은 북마크 안 한 것만이고 URL 왕복이 유지된다", () => {
    expect(parseSearchFilters({ bookmarked: "1" }).bookmark).toBe("only");
    expect(parseSearchFilters({ bookmarked: "0" }).bookmark).toBe("exclude");
    expect(parseSearchFilters({ bookmarked: "yes" }).bookmark).toBeUndefined();
    for (const bookmarked of ["1", "0"]) {
      const filters = parseSearchFilters({ bookmarked });
      expect(roundTrip(buildSearchHref(filters))).toEqual(filters);
    }
  });
});

describe("normalizeQuery", () => {
  it("최근 검색어와 서버 q가 같은 값이 되도록 NFC·공백을 정리한다", () => {
    expect(normalizeQuery("  시편   23 ".normalize("NFD"))).toBe("시편 23");
    expect(normalizeQuery("   ")).toBe("");
  });
});

describe("generateSeed", () => {
  it("parseSearchFilters가 받아들이는 형식이다", () => {
    const seed = generateSeed();
    expect(parseSearchFilters({ seed }).seed).toBe(seed);
  });
});
