import { describe, expect, it } from "vitest";
import { pickFontSubsets, removeUncoveredChars } from "./pickFontSubsets";

const CSS = `
/* a-[0]-400-normal */
@font-face {
  font-family: 'Test';
  src: url(./files/test-0-400-normal.woff2) format('woff2'), url(./files/test-0-400-normal.woff) format('woff');
  unicode-range: U+ac00-ac10,U+ff03;
}
@font-face {
  font-family: 'Test';
  src: url(./files/test-1-400-normal.woff2) format('woff2'), url(./files/test-1-400-normal.woff) format('woff');
  unicode-range: U+ac11-ac20,U+0041;
}
`;

describe("pickFontSubsets", () => {
  it("글자를 덮는 조각의 woff 파일명만 돌려준다", () => {
    expect(pickFontSubsets(CSS, "가갑")).toEqual(["test-0-400-normal.woff", "test-1-400-normal.woff"]);
  });

  it("같은 조각은 한 번만, 단일 코드포인트 범위도 매칭한다", () => {
    expect(pickFontSubsets(CSS, "가각A＃")).toEqual(["test-0-400-normal.woff", "test-1-400-normal.woff"]);
  });

  it("어느 조각에도 없는 글자는 무시한다", () => {
    expect(pickFontSubsets(CSS, "Δ")).toEqual([]);
  });
});

describe("removeUncoveredChars", () => {
  it("폰트가 덮지 못하는 글자만 제거하고 공백·줄바꿈은 둔다", () => {
    expect(removeUncoveredChars(CSS, "\uac00 \u{1F600}\n\uac11\u3042A")).toBe("\uac00 \n\uac11A");
  });
});
