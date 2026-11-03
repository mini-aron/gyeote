export interface GasazipHit {
  ref: string;
  title: string;
  artist: string;
}

// 검색 결과 한 줄: <a href="/3035433" class="... gz-candy-song-row"> ... <strong>제목</strong> <em>가수</em>
const HIT_PATTERN = /<a href="\/(\d+)" class="[^"]*gz-candy-song-row[^"]*">[\s\S]*?<strong>([\s\S]*?)<\/strong>\s*<em>([\s\S]*?)<\/em>/g;
const LYRICS_PATTERN = /<div id="gasa-copy"[^>]*>([\s\S]*?)<\/div>/;
// 결과 0건 페이지에도 이 클래스는 있다 — 없으면 사이트 구조가 바뀐 것
const SEARCH_PAGE_MARKER = "gz-candy";

const NAMED_ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };

export function decodeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, entity: string) => {
    if (entity[0] === "#") {
      const code = entity[1] === "x" || entity[1] === "X" ? parseInt(entity.slice(2), 16) : parseInt(entity.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : match;
    }
    return NAMED_ENTITIES[entity.toLowerCase()] ?? match;
  });
}

function plainText(html: string): string {
  return decodeEntities(html.replace(/<[^>]+>/g, "")).trim();
}

export function isSearchPage(html: string): boolean {
  return html.includes(SEARCH_PAGE_MARKER);
}

export function parseSearchHits(html: string): GasazipHit[] {
  return [...html.matchAll(HIT_PATTERN)].map((match) => ({
    ref: match[1],
    title: plainText(match[2]),
    artist: plainText(match[3]),
  }));
}

export function parseLyrics(html: string): string | null {
  const body = html.match(LYRICS_PATTERN)?.[1];
  if (!body) return null;
  // 소스의 줄바꿈은 의미가 없고 <br>만 줄 구분이다
  const lyrics = decodeEntities(body.replace(/\r?\n/g, "").replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, ""))
    .split("\n")
    .map((line) => line.trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return lyrics || null;
}
