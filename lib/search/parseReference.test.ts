import { describe, expect, it } from "vitest";
import { parseReference } from "./parseReference";

const BOOKS = [
  { id: 19, name: "시편" },
  { id: 43, name: "요한복음" },
  { id: 62, name: "요한일서" },
  { id: 9, name: "사무엘상" },
];

describe("parseReference", () => {
  it.each([
    ["시편 23", { bookId: 19, chapter: 23 }],
    ["시편 23:1", { bookId: 19, chapter: 23, verse: 1 }],
    ["시편23편", { bookId: 19, chapter: 23 }],
    ["요한복음3:16", { bookId: 43, chapter: 3, verse: 16 }],
    ["요한복음 3장 16절", { bookId: 43, chapter: 3, verse: 16 }],
    ["요한복음 3장16절", { bookId: 43, chapter: 3, verse: 16 }],
    ["요한복음 3：16", { bookId: 43, chapter: 3, verse: 16 }],
    ["요한일서 4:7-8", { bookId: 62, chapter: 4, verse: 7 }],
    ["  시편   23  ", { bookId: 19, chapter: 23 }],
    ["시편", { bookId: 19 }],
    ["시편 23 1", { bookId: 19, chapter: 23, verse: 1 }],
    ["시편 23장", { bookId: 19, chapter: 23 }],
  ])("%s", (query, expected) => {
    expect(parseReference(query, BOOKS)).toEqual(expected);
  });

  it("NFD로 들어온 한글도 해석한다", () => {
    expect(parseReference("시편 23".normalize("NFD"), BOOKS)).toEqual({ bookId: 19, chapter: 23 });
  });

  it.each(["사랑", "시편 말씀", "요한", "시편 0", "시편 151", "시편 23:0", "시편 23:177", "시편 231", "시편 1191"])(
    "참조가 아니면 null: %s",
    (query) => {
      expect(parseReference(query, BOOKS)).toBeNull();
    },
  );
});
