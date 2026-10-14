import { describe, expect, it } from "vitest";
import { parseFeelingTags } from "./feelingTags";

describe("parseFeelingTags", () => {
  it("목록 밖 값·중복을 거르고 개수를 자른다", () => {
    const raw = JSON.stringify({
      themes: ["위로", "스트레스", "위로", "평안", "소망", "기쁨"],
      moods: ["잔잔함", "우울함", "따뜻함", "고요함"],
      situation: "자기 전",
      crisis: false,
    });
    expect(parseFeelingTags(raw)).toEqual({
      themes: ["위로", "평안", "소망"],
      moods: ["잔잔함", "따뜻함"],
      situation: "자기 전",
      crisis: false,
    });
  });

  it("코드블록으로 감싼 응답도 읽는다", () => {
    const raw = '```json\n{"themes":["감사"],"moods":[],"situation":null,"crisis":false}\n```';
    expect(parseFeelingTags(raw).themes).toEqual(["감사"]);
  });

  it("목록에 없는 상황은 null", () => {
    const raw = JSON.stringify({ themes: ["위로"], moods: [], situation: "출근길", crisis: false });
    expect(parseFeelingTags(raw).situation).toBeNull();
  });

  it("crisis면 주제가 비어 있어도 던지지 않는다", () => {
    expect(parseFeelingTags('{"themes":[],"crisis":true}').crisis).toBe(true);
  });

  it("crisis는 true일 때만 true", () => {
    expect(parseFeelingTags(JSON.stringify({ themes: ["위로"], crisis: "true" })).crisis).toBe(false);
    expect(parseFeelingTags(JSON.stringify({ themes: ["위로"], crisis: true })).crisis).toBe(true);
  });

  it.each(['{"themes":[]}', '{"themes":["스트레스"]}', "null", "죄송해요"])("쓸 수 있는 주제가 없으면 던진다: %s", (raw) => {
    expect(() => parseFeelingTags(raw)).toThrow();
  });
});
