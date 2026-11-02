import { describe, expect, it } from "vitest";
import { buildShareFileName } from "./buildShareFileName";

describe("buildShareFileName", () => {
  it("날짜 기반 안전한 파일명", () => {
    expect(buildShareFileName(new Date(2026, 10, 2))).toBe("gyeote-20261102.png");
  });
});
