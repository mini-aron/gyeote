import { describe, expect, it } from "vitest";
import { fitSongLine, fitVerseText, splitVerseLines } from "./fitVerseText";

describe("splitVerseLines", () => {
  it("여러 절은 참조의 시작 절부터 번호를 붙인다", () => {
    expect(splitVerseLines("시편 23:1-3", "가\n나\n다")).toEqual([
      { number: 1, text: "가" },
      { number: 2, text: "나" },
      { number: 3, text: "다" },
    ]);
  });

  it("한 줄이거나 참조에서 절을 못 읽으면 번호 없이 한 덩어리", () => {
    expect(splitVerseLines("시편 23:1", "가")).toEqual([{ number: null, text: "가" }]);
    expect(splitVerseLines("잠언", "가\n나")).toEqual([{ number: null, text: "가\n나" }]);
  });
});

describe("fitVerseText", () => {
  it("짧을수록 크게, 길수록 작게", () => {
    const short = fitVerseText([{ number: null, text: "여호와는 나의 목자시니 내가 부족함이 없으리로다" }]);
    const long = fitVerseText([{ number: null, text: "가".repeat(359) }]);
    expect(short.fontSize).toBeGreaterThan(long.fontSize);
  });

  it("최대 길이도 가장 작은 단계 안에서 처리한다", () => {
    const longest = fitVerseText(
      [15, 16, 17].map((number) => ({ number, text: "가나다 ".repeat(40).trim() })),
    );
    expect(longest.fontSize).toBeGreaterThanOrEqual(32);
  });
});

describe("fitVerseText 실제 최대 사례", () => {
  it("359자 3절과 40자 8절 모두 가장 작은 단계 이상으로 들어간다", () => {
    const long = fitVerseText([15, 16, 17].map((number) => ({ number, text: "가나다라 ".repeat(30).trim().slice(0, 119) })));
    const eight = fitVerseText(Array.from({ length: 8 }, (_, i) => ({ number: i + 1, text: "나나나나 ".repeat(10).trim() })));
    expect(long.fontSize).toBeGreaterThanOrEqual(32);
    expect(eight.fontSize).toBeGreaterThanOrEqual(32);
  });
});

describe("fitSongLine", () => {
  it("짧은 표기는 그대로 둔다", () => {
    expect(fitSongLine("주 은혜임을", "마커스").text).toBe("주 은혜임을 · 마커스");
  });

  it("너무 길면 말줄임표로 자른다", () => {
    const fit = fitSongLine("가".repeat(80), "아티스트");
    expect(fit.text.endsWith("…")).toBe(true);
    expect(fit.text.length).toBeLessThan(40);
  });
});
