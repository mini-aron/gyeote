import { describe, expect, it } from "vitest";
import { isShareCancel } from "./isShareCancel";

describe("isShareCancel", () => {
  it("AbortError만 취소로 본다", () => {
    expect(isShareCancel(new DOMException("x", "AbortError"))).toBe(true);
    expect(isShareCancel(new DOMException("x", "NotAllowedError"))).toBe(false);
    expect(isShareCancel(new Error("x"))).toBe(false);
  });
});
