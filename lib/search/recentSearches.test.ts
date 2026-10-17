import { afterEach, describe, expect, it, vi } from "vitest";
import { addRecentSearch, clearRecentSearches, readRecentSearches } from "./recentSearches";

function stubStorage(initial?: string) {
  const store = new Map<string, string>(initial === undefined ? [] : [["gyeote:recentSearches", initial]]);
  vi.stubGlobal("window", {
    localStorage: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => void store.set(key, value),
      removeItem: (key: string) => void store.delete(key),
    },
  });
  return store;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("recentSearches", () => {
  it("새 검색어를 맨 앞에 두고 중복을 없애며 5개까지만 남긴다", () => {
    stubStorage();
    for (const q of ["a", "b", "c", "d", "e", "f"]) addRecentSearch(q);
    expect(addRecentSearch("c")).toEqual(["c", "f", "e", "d", "b"]);
    expect(readRecentSearches()).toEqual(["c", "f", "e", "d", "b"]);
  });

  it("깨진 값이나 문자열이 아닌 항목은 무시한다", () => {
    stubStorage("{not json");
    expect(readRecentSearches()).toEqual([]);
    stubStorage(JSON.stringify(["시편 23", 3, null]));
    expect(readRecentSearches()).toEqual(["시편 23"]);
  });

  it("지우면 비어 있다", () => {
    stubStorage(JSON.stringify(["은혜"]));
    clearRecentSearches();
    expect(readRecentSearches()).toEqual([]);
  });

  it("storage를 쓸 수 없어도 던지지 않는다", () => {
    const fail = () => {
      throw new Error("blocked");
    };
    vi.stubGlobal("window", { localStorage: { getItem: fail, setItem: fail, removeItem: fail } });
    expect(readRecentSearches()).toEqual([]);
    expect(addRecentSearch("은혜")).toEqual(["은혜"]);
    expect(() => clearRecentSearches()).not.toThrow();
  });
});
