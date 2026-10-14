import { describe, expect, it } from "vitest";
import { buildSearchHref, generateSeed, parseSearchFilters } from "./searchQuery";

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

describe("generateSeed", () => {
  it("parseSearchFilters가 받아들이는 형식이다", () => {
    const seed = generateSeed();
    expect(parseSearchFilters({ seed }).seed).toBe(seed);
  });
});
