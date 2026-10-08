import type { DuplicateMatch, ExistingSong } from "./types";

const HANGUL = /[ㄱ-ㆎ가-힣]/;
const KEY_NOISE = /[^ㄱ-ㆎ가-힣a-z0-9]/g;
const ARTIST_SPLIT = /[()/&,]/;

export function hasHangul(text: string): boolean {
  return HANGUL.test(text);
}

export function titleKey(text: string): string {
  return text.normalize("NFKC").toLowerCase().replace(KEY_NOISE, "");
}

// 부제 괄호를 제거한 느슨한 키 — "곡명(Remaster)" 같은 변형을 약한 중복으로 잡는다
function looseTitleKey(text: string): string {
  return titleKey(text.normalize("NFKC").replace(/\([^)]*\)/g, ""));
}

// "어노인팅 ANOINTING"처럼 한글·영문이 공백으로 병기된 조각은 따로 키로 만든다
function splitScripts(piece: string): string[] {
  return piece.match(/[\u3131-\u318E\uAC00-\uD7A3][\u3131-\u318E\uAC00-\uD7A3\s]*|[^\u3131-\u318E\uAC00-\uD7A3]+/g) ?? [];
}

export function artistKeys(artist: string): string[] {
  const keys = new Set<string>();
  for (const piece of artist.normalize("NFKC").split(ARTIST_SPLIT)) {
    const whole = titleKey(piece);
    if (!whole) continue;
    keys.add(whole);
    for (const part of splitScripts(piece)) {
      const key = titleKey(part);
      if (key) keys.add(key);
    }
  }
  return [...keys];
}

export function primaryArtistKey(artist: string): string {
  const keys = artistKeys(artist);
  const hangulKey = keys.find((key) => hasHangul(key));
  if (hangulKey) return hangulKey;
  return keys.reduce((a, b) => (b.length < a.length ? b : a), keys[0] ?? "");
}

export function dedupeKey(title: string, artist: string): string | null {
  const key = titleKey(title);
  if (!key) return null;
  return `${key}|${primaryArtistKey(artist)}`;
}

export type SongIndex = {
  byExactTitle: Map<string, { id: string; artistKeys: Set<string> }[]>;
  byLooseTitle: Map<string, { id: string; artistKeys: Set<string> }[]>;
};

function push<T>(map: Map<string, T[]>, key: string, value: T) {
  if (!key) return;
  const list = map.get(key);
  if (list) list.push(value);
  else map.set(key, [value]);
}

export function buildSongIndex(songs: readonly ExistingSong[]): SongIndex {
  const index: SongIndex = { byExactTitle: new Map(), byLooseTitle: new Map() };
  for (const song of songs) {
    const entry = { id: song.id, artistKeys: new Set(artistKeys(song.artist)) };
    push(index.byExactTitle, titleKey(song.title), entry);
    push(index.byLooseTitle, looseTitleKey(song.title), entry);
  }
  return index;
}

export function matchExistingSong(
  index: SongIndex,
  title: string,
  artist: string,
): DuplicateMatch {
  const keys = artistKeys(artist);
  const sameArtist = (entry: { artistKeys: Set<string> }) =>
    keys.some((key) => entry.artistKeys.has(key));

  const exact = index.byExactTitle.get(titleKey(title)) ?? [];
  const exactHit = exact.find(sameArtist);
  if (exactHit) return { kind: "duplicate", songId: exactHit.id };

  const loose = index.byLooseTitle.get(looseTitleKey(title)) ?? [];
  const candidate = loose.find(sameArtist) ?? exact[0] ?? loose[0];
  if (candidate) return { kind: "possibleDuplicate", songId: candidate.id };

  return { kind: "new" };
}
