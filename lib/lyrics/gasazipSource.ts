import "server-only";
import { isSearchPage, parseLyrics, parseSearchHits, type GasazipHit } from "@/lib/lyrics/gasazip";

const BASE_URL = "https://gasazip.com";
const REQUEST_TIMEOUT_MS = 15_000;
const USER_AGENT = "Mozilla/5.0 (compatible; gyeote-lyrics/1.0)";

export class GasazipError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GasazipError";
  }
}

async function fetchHtml(path: string): Promise<string> {
  const response = await fetch(`${BASE_URL}${path}`, {
    headers: { "User-Agent": USER_AGENT },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    cache: "no-store",
  });
  if (!response.ok) throw new GasazipError(`가사집 응답 ${response.status}`);
  return response.text();
}

export async function searchGasazip(query: string): Promise<GasazipHit[]> {
  const html = await fetchHtml(`/search.html?q=${encodeURIComponent(query)}`);
  if (!isSearchPage(html)) throw new GasazipError("가사집 검색 페이지 구조가 바뀌었어요");
  return parseSearchHits(html);
}

// 찾은 곡인데 가사를 못 뽑으면 구조가 바뀐 것이라 "없음"으로 저장하지 않고 실패로 올린다
export async function fetchGasazipLyrics(ref: string): Promise<string> {
  const lyrics = parseLyrics(await fetchHtml(`/${ref}`));
  if (!lyrics) throw new GasazipError("가사집 가사 영역을 찾지 못했어요");
  return lyrics;
}
