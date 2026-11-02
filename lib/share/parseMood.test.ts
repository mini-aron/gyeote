import { describe, expect, it } from "vitest";
import { parseMood } from "./parseMood";

describe("parseMood", () => {
  it("유효한 무드는 그대로 돌려준다", () => {
    expect(parseMood("dawn")).toBe("dawn");
    expect(parseMood("dusk")).toBe("dusk");
  });

  it("알 수 없는 값은 night로 대체한다", () => {
    expect(parseMood("sunset")).toBe("night");
    expect(parseMood(undefined)).toBe("night");
    expect(parseMood(["day"])).toBe("night");
  });
});
