import { describe, expect, it } from "vitest";
import { activeFilterChips } from "./activeFilters";
import { parseSearchFilters } from "./searchQuery";
import type { SearchOptions } from "./types";

const THEME = "00000000-0000-4000-8000-000000000001";
const MOOD = "00000000-0000-4000-8000-000000000002";
const OPTIONS: SearchOptions = {
  themes: [{ id: THEME, name: "위로" }],
  situations: [{ id: "00000000-0000-4000-8000-000000000003", name: "자기 전" }],
  moods: [{ id: MOOD, name: "잔잔함" }],
  books: [
    { id: 19, name: "시편", testament: "old", category: "시가서", hasVerses: true },
    { id: 43, name: "요한복음", testament: "new", category: "복음서", hasVerses: true },
  ],
  chapters: [],
};

describe("activeFilterChips", () => {
  it("성경 범위는 가장 좁은 단계 하나만 보여주고, 지우면 한 단계 넓어진다", () => {
    const chips = activeFilterChips(parseSearchFilters({ testament: "new", category: "복음서", book: "43", chapter: "3" }), OPTIONS);
    expect(chips).toEqual([{ key: "chapter", label: "요한복음 3장", remove: { chapter: undefined } }]);
  });

  it("시편은 '편'으로 표시한다", () => {
    expect(activeFilterChips(parseSearchFilters({ testament: "old", book: "19", chapter: "23" }), OPTIONS)[0].label).toBe("시편 23편");
  });

  it("북마크와 태그를 칩으로 만들고, 태그 칩은 그 태그만 뺀다", () => {
    const filters = parseSearchFilters({ type: "song", bookmarked: "1", theme: THEME, mood: MOOD });
    expect(activeFilterChips(filters, OPTIONS)).toEqual([
      { key: "bookmark", label: "북마크", remove: { bookmark: undefined } },
      { key: `theme:${THEME}`, label: "위로", remove: { theme: [] } },
      { key: `mood:${MOOD}`, label: "잔잔함", remove: { mood: [] } },
    ]);
  });

  it("분류만 켜지면 분류 칩을 지워도 구약·신약은 남는다", () => {
    const [chip] = activeFilterChips(parseSearchFilters({ testament: "old", category: "시가서" }), OPTIONS);
    expect(chip).toEqual({ key: "category", label: "시가서", remove: { category: undefined, book: undefined, chapter: undefined } });
  });

  it("구약·신약만 켜지면 그 칩 하나", () => {
    expect(activeFilterChips(parseSearchFilters({ testament: "new" }), OPTIONS).map((c) => c.label)).toEqual(["신약"]);
  });

  it("같은 그룹 태그가 둘이면 칩마다 자기 태그만 뺀다", () => {
    const other = "00000000-0000-4000-8000-000000000004";
    const options = { ...OPTIONS, themes: [...OPTIONS.themes, { id: other, name: "감사" }] };
    const chips = activeFilterChips(parseSearchFilters({ theme: [THEME, other], situation: "00000000-0000-4000-8000-000000000003" }), options);
    expect(chips.map((c) => [c.label, c.remove])).toEqual([
      ["위로", { theme: [other] }],
      ["감사", { theme: [THEME] }],
      ["자기 전", { situation: [] }],
    ]);
  });

  it("목록에 없는 태그 id는 건너뛴다", () => {
    const filters = parseSearchFilters({ theme: "00000000-0000-4000-8000-000000000009" });
    expect(activeFilterChips(filters, OPTIONS)).toEqual([]);
  });
});
