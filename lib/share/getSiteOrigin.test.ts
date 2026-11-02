import { describe, expect, it } from "vitest";
import { getSiteOrigin } from "./getSiteOrigin";

describe("getSiteOrigin", () => {
  it("프로덕션은 고정 도메인", () => {
    expect(getSiteOrigin({ VERCEL_ENV: "production", VERCEL_URL: "x.vercel.app" })).toBe("https://gyeote.site");
  });

  it("프리뷰는 배포 URL", () => {
    expect(getSiteOrigin({ VERCEL_ENV: "preview", VERCEL_URL: "x.vercel.app" })).toBe("https://x.vercel.app");
  });

  it("그 외는 로컬", () => {
    expect(getSiteOrigin({})).toBe("http://localhost:3000");
  });
});
