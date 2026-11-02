import { describe, expect, it } from "vitest";
import { listShareOptions } from "./listShareOptions";

describe("listShareOptions", () => {
  it("모바일에서 카드가 준비되면 네 가지를 모두 보여준다", () => {
    expect(listShareOptions({ hasShare: true, canShareFile: true, hasFile: true })).toEqual([
      "image",
      "link",
      "copy",
      "save",
    ]);
  });
  it("카드가 아직 없으면 이미지 항목을 숨긴다", () => {
    expect(listShareOptions({ hasShare: true, canShareFile: false, hasFile: false })).toEqual(["link", "copy"]);
  });
  it("공유 API가 없으면 복사와 저장만 남는다", () => {
    expect(listShareOptions({ hasShare: false, canShareFile: false, hasFile: true })).toEqual(["copy", "save"]);
  });
  it("파일 공유를 못 하는 기기는 이미지로 공유를 빼고 저장은 남긴다", () => {
    expect(listShareOptions({ hasShare: true, canShareFile: false, hasFile: true })).toEqual([
      "link",
      "copy",
      "save",
    ]);
  });
});
