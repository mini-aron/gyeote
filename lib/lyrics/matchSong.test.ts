import { describe, expect, it } from "vitest";
import { normalizeName, pickLyricsMatch } from "./matchSong";

const hit = (ref: string, title: string, artist: string) => ({ ref, title, artist });

describe("normalizeName", () => {
  it("괄호 부제·피처링·공백·문장부호를 뺀다", () => {
    expect(normalizeName("주를 바라보며 (Live)")).toBe("주를바라보며");
    expect(normalizeName("은혜 feat. 지선")).toBe("은혜");
    expect(normalizeName("Way Maker [Remastered]!")).toBe("waymaker");
  });
});

describe("pickLyricsMatch", () => {
  it("제목이 같고 가수가 한쪽 이름에 포함되면 찾은 것으로 본다", () => {
    const hits = [hit("1", "주를 바라보며", "다른 가수"), hit("2", "주를 바라보며", "어노인팅")];
    expect(pickLyricsMatch({ title: "주를 바라보며", artist: "어노인팅 ANOINTING" }, hits)).toEqual({ status: "found", ref: "2" });
  });

  it("가사집 가수가 여러 명이면 그중 하나만 맞아도 된다", () => {
    const hits = [hit("3", "은혜", "지선, 손경민")];
    expect(pickLyricsMatch({ title: "은혜", artist: "손경민" }, hits)).toEqual({ status: "found", ref: "3" });
  });

  it("영문 채널명은 한글 별칭으로, 괄호 속 영문명으로도 맞춘다", () => {
    expect(pickLyricsMatch({ title: "축복의 샘", artist: "The Potter" }, [hit("7", "축복의 샘", "옹기장이")])).toEqual({ status: "found", ref: "7" });
    const isaiah = [hit("8", "새로운 마음", "아이자야 씩스티원(Isaiah 6tyone)")];
    expect(pickLyricsMatch({ title: "새로운 마음", artist: "Isaiah 6tyOne" }, isaiah)).toEqual({ status: "found", ref: "8" });
  });

  it("제목만 같고 가수가 다르면 동명이곡일 수 있어 보류한다", () => {
    const hits = [hit("4", "은혜", "다른 팀")];
    expect(pickLyricsMatch({ title: "은혜", artist: "손경민" }, hits)).toEqual({ status: "ambiguous", ref: "4" });
  });

  it("제목이 다르면 없음", () => {
    expect(pickLyricsMatch({ title: "은혜", artist: "손경민" }, [hit("5", "은혜 아니면", "손경민")])).toEqual({ status: "not_found" });
    expect(pickLyricsMatch({ title: "(Intro)", artist: "손경민" }, [hit("6", "", "손경민")])).toEqual({ status: "not_found" });
  });
});
