import { describe, expect, it } from "vitest";
import { formatSongLabel } from "./formatSongLabel";

describe("formatSongLabel", () => {
  it("제목과 아티스트를 중점으로 잇는다", () => {
    expect(formatSongLabel("주 은혜임을", "마커스")).toBe("주 은혜임을 · 마커스");
  });

  it("아티스트가 비었거나 Unknown이면 생략한다", () => {
    expect(formatSongLabel("곡", "")).toBe("곡");
    expect(formatSongLabel("곡", "  ")).toBe("곡");
    expect(formatSongLabel("곡", "UNKNOWN")).toBe("곡");
  });
});
