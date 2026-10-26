import { describe, expect, it } from "vitest";
import { decodeEntities, isSearchPage, parseLyrics, parseSearchHits } from "./gasazip";

const SEARCH_HTML = `
<div class="gz-candy-list">
  <a href="/3035433" class="list-group-item list-group-item-action gz-candy-row gz-candy-song-row">
    <span class="gz-candy-album">♪</span>
    <span class="gz-candy-row-main"> <strong>주를 바라보며</strong> <em>GIFTED</em>
      <span class="gz-candy-snippet"> 나의 <em>시선이</em> </span></span>
  </a>
  <a href="/2385009" class="list-group-item gz-candy-row gz-candy-song-row">
    <strong>위대하신 주를 &amp; 찬양</strong> <em>클래식 콰이어</em>
  </a>
  <a href="/top100.html">인기가사</a>
</div>`;

describe("parseSearchHits", () => {
  it("곡 행만 골라 번호·제목·가수를 뽑는다", () => {
    expect(parseSearchHits(SEARCH_HTML)).toEqual([
      { ref: "3035433", title: "주를 바라보며", artist: "GIFTED" },
      { ref: "2385009", title: "위대하신 주를 & 찬양", artist: "클래식 콰이어" },
    ]);
  });

  it("검색 페이지 표식이 없으면 구조가 바뀐 것으로 본다", () => {
    expect(isSearchPage(SEARCH_HTML)).toBe(true);
    expect(isSearchPage("<html>점검 중</html>")).toBe(false);
  });
});

describe("parseLyrics", () => {
  it("줄바꿈을 살리고 태그·엔티티·빈 줄 반복을 정리한다", () => {
    const html = `<div id="gasa-copy" aria-hidden="true" style="position:absolute">
      나의 시선이<br />
작고 초라한 &quot;모습&quot;<br /><br /><br /><br />
  주를 바라보며  <br>
    </div>`;
    expect(parseLyrics(html)).toBe('나의 시선이\n작고 초라한 "모습"\n\n주를 바라보며');
  });

  it("가사 영역이 없거나 비어 있으면 null", () => {
    expect(parseLyrics("<div>없음</div>")).toBeNull();
    expect(parseLyrics('<div id="gasa-copy">  <br/> </div>')).toBeNull();
  });
});

describe("decodeEntities", () => {
  it("숫자·이름 엔티티를 푼다", () => {
    expect(decodeEntities("&#39;a&#x27; &lt;b&gt; &unknown;")).toBe("'a' <b> &unknown;");
  });
});
