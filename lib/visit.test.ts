import { afterEach, describe, expect, it, vi } from "vitest";
import { checkAndRecordVisit, recordEntry } from "./visit";

function stubStorage(store = new Map<string, string>()) {
  vi.stubGlobal("window", {
    localStorage: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => void store.set(key, value),
    },
  });
  return store;
}

function stubBrokenStorage() {
  const fail = () => {
    throw new Error("storage unavailable");
  };
  vi.stubGlobal("window", { localStorage: { getItem: fail, setItem: fail } });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("checkAndRecordVisit", () => {
  it("첫 방문은 false, 그다음부터 true", () => {
    const store = stubStorage();
    const now = new Date("2026-10-14T00:00:00Z");
    expect(checkAndRecordVisit(now)).toBe(false);
    expect(store.get("gyeote:lastVisit")).toBe(now.toISOString());
    expect(checkAndRecordVisit()).toBe(true);
  });

  it("storage를 쓸 수 없으면 첫 방문으로 취급한다", () => {
    stubBrokenStorage();
    expect(checkAndRecordVisit()).toBe(false);
  });

  it("서버(window 없음)에서는 false", () => {
    expect(checkAndRecordVisit()).toBe(false);
  });
});

describe("recordEntry", () => {
  it("선택한 입구를 저장한다", () => {
    const store = stubStorage();
    recordEntry("church");
    expect(store.get("gyeote:lastEntry")).toBe("church");
  });

  it("storage 오류는 삼킨다", () => {
    stubBrokenStorage();
    expect(() => recordEntry("backyard")).not.toThrow();
  });
});
