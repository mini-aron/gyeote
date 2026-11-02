import { describe, expect, it } from "vitest";
import { buildShareUrl } from "./buildShareUrl";

describe("buildShareUrl", () => {
  it("말씀, 곡, 무드만 담은 URL을 만든다", () => {
    expect(buildShareUrl("https://gyeote.site", "v1", "s1", "night")).toBe(
      "https://gyeote.site/share/v1?song=s1&mood=night",
    );
  });

  it("곡이 없으면 song 파라미터를 생략한다", () => {
    expect(buildShareUrl("https://gyeote.site", "v1", null, "dawn")).toBe(
      "https://gyeote.site/share/v1?mood=dawn",
    );
  });
});
