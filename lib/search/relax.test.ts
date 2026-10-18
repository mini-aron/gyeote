import { describe, expect, it } from "vitest";
import { pickSuggestions, relaxationCandidates } from "./relax";
import { parseSearchFilters } from "./searchQuery";

const A = "00000000-0000-4000-8000-000000000001";
const B = "00000000-0000-4000-8000-000000000002";

describe("relaxationCandidates", () => {
  it("켜진 조건마다 하나씩 빼 본다", () => {
    const filters = parseSearchFilters({ type: "song", q: "은혜", bookmarked: "1", theme: A, mood: B });
    expect(relaxationCandidates(filters).map((candidate) => candidate.label)).toEqual([
      "검색어 없이",
      "북마크 밖에서도",
      "주제 없이",
      "분위기 없이",
      "하나라도 맞는 것",
    ]);
  });

  it("북마크 안 한 것만이면 북마크한 것도 함께 보는 후보를 낸다", () => {
    const [candidate] = relaxationCandidates(parseSearchFilters({ bookmarked: "0" }));
    expect(candidate.label).toBe("북마크한 것도 함께");
    expect(candidate.filters.bookmark).toBeUndefined();
  });

  it("성경 범위는 가장 좁은 단계만 푼다", () => {
    const filters = parseSearchFilters({ testament: "old", book: "19", chapter: "23" });
    const [candidate] = relaxationCandidates(filters);
    expect(candidate.label).toBe("편 선택 없이");
    expect(candidate.filters).toMatchObject({ testament: "old", book: 19, chapter: undefined });
  });

  it("범위는 장 → 책 → 분류 → 구약·신약 순으로 한 단계만 푼다", () => {
    const labels = (raw: Record<string, string>) => relaxationCandidates(parseSearchFilters(raw)).map((c) => c.label);
    expect(labels({ testament: "old", book: "19", chapter: "23" })).toEqual(["편 선택 없이"]);
    expect(labels({ testament: "new", book: "43" })).toEqual(["책 선택 없이"]);
    expect(labels({ testament: "old", category: "시가서" })).toEqual(["분류 선택 없이"]);
    expect(labels({ testament: "old" })).toEqual(["구약·신약 구분 없이"]);
  });

  it("상황만 켜져도 후보가 있다", () => {
    expect(relaxationCandidates(parseSearchFilters({ situation: A })).map((c) => c.label)).toEqual(["상황 없이"]);
  });

  it("이미 하나라도 맞는 모드거나 태그가 하나뿐이면 그 후보는 없다", () => {
    expect(relaxationCandidates(parseSearchFilters({ theme: [A, B], match: "any" })).map((c) => c.label)).not.toContain("하나라도 맞는 것");
    expect(relaxationCandidates(parseSearchFilters({ theme: A })).map((c) => c.label)).not.toContain("하나라도 맞는 것");
  });

  it("조건이 없으면 후보도 없다", () => {
    expect(relaxationCandidates(parseSearchFilters({}))).toEqual([]);
  });
});

describe("pickSuggestions", () => {
  it("0개는 버리고 많은 순으로 3개까지", () => {
    const s = (label: string, count: number) => ({ label, href: `/search?${label}`, count });
    expect(pickSuggestions([s("a", 2), s("b", 0), s("c", 9), s("d", 5), s("e", 1)]).map((x) => x.label)).toEqual(["c", "d", "a"]);
  });
});
