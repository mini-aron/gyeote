import type { GasazipHit } from "@/lib/lyrics/gasazip";

export type LyricsMatch =
  | { status: "found"; ref: string }
  | { status: "ambiguous"; ref: string }
  | { status: "not_found" };

// 괄호 속 부제·피처링과 공백·문장부호를 빼고 비교한다 — "주를 바라보며 (Live)"와 "주를바라보며"를 같은 곡으로 본다
export function normalizeName(value: string): string {
  return value
    .normalize("NFC")
    .toLowerCase()
    .replace(/\([^)]*\)|\[[^\]]*\]/g, "")
    .replace(/\b(feat|ft)\..*$/, "")
    .replace(/[^\p{L}\p{N}]/gu, "");
}

// 가수명은 괄호 안에 다른 표기("아이자야 씩스티원(Isaiah 6tyone)")를 적는 경우가 많아 괄호 내용을 살린다
function normalizeArtist(value: string): string {
  return value.normalize("NFC").toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
}

// 유튜브 Topic 채널은 영문명만 쓰는데 가사집은 한글명만 쓰는 팀
const ARTIST_ALIASES: Record<string, string[]> = {
  thepotter: ["옹기장이"],
  soriel: ["소리엘"],
  poetrypaintings: ["시와그림"],
  yumpyungahn: ["염평안"],
  jus: ["제이어스"],
};

// 유튜브 Topic 채널 이름은 "어노인팅 ANOINTING"처럼 한·영을 같이 쓰고, 가사집은 한쪽만 쓰는 경우가 많다
function artistMatches(songArtist: string, hitArtist: string): boolean {
  const ours = normalizeArtist(songArtist);
  if (!ours) return false;
  const names = [ours, ...(ARTIST_ALIASES[ours] ?? [])];
  return hitArtist
    .split(/[,&/]/)
    .map(normalizeArtist)
    .some((theirs) => theirs.length > 0 && names.some((name) => name.includes(theirs) || theirs.includes(name)));
}

export function pickLyricsMatch(song: { title: string; artist: string }, hits: GasazipHit[]): LyricsMatch {
  const title = normalizeName(song.title);
  if (!title) return { status: "not_found" };
  const sameTitle = hits.filter((hit) => normalizeName(hit.title) === title);
  const exact = sameTitle.find((hit) => artistMatches(song.artist, hit.artist));
  if (exact) return { status: "found", ref: exact.ref };
  if (sameTitle.length > 0) return { status: "ambiguous", ref: sameTitle[0].ref };
  return { status: "not_found" };
}
