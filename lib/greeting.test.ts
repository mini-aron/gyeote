import { describe, expect, it } from "vitest";
import { getGreeting, getSeoulDateString, getTimeBand } from "./greeting";

function seoul(hour: number, minute = 0): Date {
  return new Date(Date.UTC(2026, 9, 14, hour - 9, minute));
}

describe("getTimeBand", () => {
  it.each([
    [0, 0, "night"],
    [4, 59, "night"],
    [5, 0, "dawn"],
    [6, 59, "dawn"],
    [7, 0, "morning"],
    [11, 59, "morning"],
    [12, 0, "afternoon"],
    [17, 59, "afternoon"],
    [18, 0, "evening"],
    [22, 59, "evening"],
    [23, 0, "night"],
  ] as const)("서울 %i:%i → %s", (hour, minute, band) => {
    expect(getTimeBand(seoul(hour, minute))).toBe(band);
  });
});

describe("getGreeting", () => {
  it("재방문이면 앞에 인사를 덧붙인다", () => {
    const first = getGreeting(seoul(8), false);
    expect(getGreeting(seoul(8), true)).toBe(`또 오셨네요. ${first}`);
  });
});

describe("getSeoulDateString", () => {
  it("UTC로는 전날이어도 서울 날짜를 돌려준다", () => {
    expect(getSeoulDateString(new Date("2026-10-14T16:00:00Z"))).toBe("2026-10-15");
  });
});
