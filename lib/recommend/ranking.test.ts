import { describe, expect, it } from "vitest";
import { parseVersePick, rankVerseCandidates, scoreVerse, shuffle } from "./ranking";

const tags = { situation: "저녁", themes: ["위로"], moods: [] };

describe("scoreVerse", () => {
  it("주제 일치를 시간대 일치보다 무겁게 친다", () => {
    const themeOnly = scoreVerse({ themes: ["위로"], situations: ["아침"] }, tags);
    const situationOnly = scoreVerse({ themes: ["회개"], situations: ["저녁"] }, tags);
    expect(themeOnly).toBeGreaterThan(situationOnly);
  });

  it("주제가 같으면 시간대 일치가 순서를 가른다", () => {
    const withSituation = scoreVerse({ themes: ["위로"], situations: ["저녁"] }, tags);
    const withoutSituation = scoreVerse({ themes: ["위로"], situations: ["아침"] }, tags);
    expect(withSituation).toBeGreaterThan(withoutSituation);
  });
});

describe("rankVerseCandidates", () => {
  it("점수 순으로 limit개까지 자른다", () => {
    const pool = [
      { id: "a", themes: ["회개"], situations: [] },
      { id: "b", themes: ["위로"], situations: ["저녁"] },
      { id: "c", themes: ["위로"], situations: [] },
    ];
    expect(rankVerseCandidates(pool, tags, 2).map((v) => v.id)).toEqual(["b", "c"]);
  });

  it("동점이면 DB 순서에 묶이지 않는다", () => {
    const pool = Array.from({ length: 30 }, (_, i) => ({ id: String(i), themes: ["위로"], situations: [] }));
    const firstIds = new Set(
      Array.from({ length: 20 }, () => rankVerseCandidates(pool, tags, 1)[0].id),
    );
    expect(firstIds.size).toBeGreaterThan(1);
  });

  it("점수 있는 후보가 모자라면 나머지로 채운다", () => {
    const pool = [
      { id: "a", themes: ["위로"], situations: [] },
      { id: "b", themes: ["감사"], situations: [] },
    ];
    expect(rankVerseCandidates(pool, tags, 5)).toHaveLength(2);
  });
});

describe("shuffle", () => {
  it("원본을 바꾸지 않고 같은 원소를 돌려준다", () => {
    const items = [1, 2, 3, 4];
    const result = shuffle(items);
    expect(items).toEqual([1, 2, 3, 4]);
    expect([...result].sort()).toEqual([1, 2, 3, 4]);
  });
});

describe("parseVersePick", () => {
  it("1부터 센 번호를 0부터 센 인덱스로 바꾼다", () => {
    expect(parseVersePick('{"pick": 3}', 5)).toBe(2);
  });

  it("코드블록으로 감싼 응답도 읽는다", () => {
    expect(parseVersePick('```json\n{"pick": 1}\n```', 5)).toBe(0);
  });

  it("범위를 벗어나면 던진다", () => {
    expect(() => parseVersePick('{"pick": 6}', 5)).toThrow();
    expect(() => parseVersePick('{"pick": 0}', 5)).toThrow();
  });

  it("JSON이 아니면 던진다", () => {
    expect(() => parseVersePick("3번이 좋겠어요", 5)).toThrow();
  });
});
