import { describe, expect, it } from "vitest";
import { parseShareCardQuery } from "./parseShareCardQuery";

const VERSE = "de232807-fbaf-4cb4-8941-01f681ad33e2";
const SONG = "a9e1417b-e094-4e88-af0a-e96572df7ee0";

describe("parseShareCardQuery", () => {
  it("정규형이면 isCanonical", () => {
    const result = parseShareCardQuery(`verse=${VERSE}&mood=night&song=${SONG}`);
    expect(result).toMatchObject({ valid: true, verseId: VERSE, songId: SONG, mood: "night", isCanonical: true });
  });

  it("곡이 없는 정규형", () => {
    expect(parseShareCardQuery(`verse=${VERSE}&mood=day`)).toMatchObject({ valid: true, songId: null, isCanonical: true });
  });

  it("대문자 id·순서·추가 파라미터는 정규형으로 고쳐 준다", () => {
    const expected = `/api/share-card?verse=${VERSE}&mood=night&song=${SONG}`;
    for (const search of [
      `verse=${VERSE.toUpperCase()}&mood=night&song=${SONG}`,
      `song=${SONG}&mood=night&verse=${VERSE}`,
      `verse=${VERSE}&mood=night&song=${SONG}&utm=x`,
    ]) {
      const result = parseShareCardQuery(search);
      expect(result).toMatchObject({ valid: true, isCanonical: false, canonicalPath: expected });
    }
  });

  it("잘못된 id나 mood는 무효", () => {
    expect(parseShareCardQuery(`verse=nope&mood=night`)).toEqual({ valid: false });
    expect(parseShareCardQuery(`verse=${VERSE}&mood=sunset`)).toEqual({ valid: false });
    expect(parseShareCardQuery(`verse=${VERSE}`)).toEqual({ valid: false });
    expect(parseShareCardQuery(`verse=${VERSE}&mood=night&song=x`)).toEqual({ valid: false });
  });
});
