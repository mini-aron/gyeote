import { hasHangul } from "./normalizeSong";
import type { FilterResult, YoutubeVideo } from "./types";

const SHORT_MAX_SECONDS = 60;
const LONG_MIN_SECONDS = 15 * 60;

const EXCLUDED_KEYWORDS =
  /티저|\bTeaser\b|\bTrailer\b|비하인드|\bBehind\b|메이킹|인터뷰|\bMR\b|\bInst\b|\bInstrumental\b|반주|연속\s?듣기|\bPlaylist\b|보컬\s?클래스|목요예배|뒷이야기|시사회|팟캐스트|전체보기|\bRecap\b|\bNotice\b|티켓|#shorts?\b/i;

// 곡명 일부로 쓰일 수 있는 짧은 한국어 단어는 독립 단어/조각일 때만 제외한다
// 곡명에 쓰일 수 있는 영어 단어는 대문자 TALK나 행사명과 붙은 Camp일 때만 제외한다
const EVENT_ENGLISH =
  /\bTALK\b|\b(?:Winter|Summer|FIC|Youth)\s+Camp\b|\bCamp\s+(?:20)?\d{2}\b|\b(?:19|20)\d{2}\s+(?:\S+\s+)?Camp\b/;
const STANDALONE_WORDS = new Set(["설교", "간증", "캠프"]);
const PIECE_ONLY_WORDS = /^(?:(?:피아노|기타|오케스트라|바이올린|색소폰|첼로|플룻|찬양|워십|CCM|찬송가)\s+)?(?:연주|모음)(?:\s*[:：].*)?$/;
const INSTRUMENT_PLAY =
  /\b(?:Drums?|Piano|Bass|Guitar|(?:Aux\s*)?Keys?|Synth|Organ|Violin|Cello|Strings|EG|AG)\b[^|)]*연주/i;
const SPLIT_PIECES = /[()[\]|\-–—·,]/;

function matchKoreanKeyword(title: string): string | null {
  for (const piece of title.split(SPLIT_PIECES).map((p) => p.trim())) {
    if (PIECE_ONLY_WORDS.test(piece) || /^talk$/i.test(piece)) return piece;
    for (const token of piece.split(/[\s:：]+/)) {
      if (STANDALONE_WORDS.has(token)) return token;
    }
  }
  return null;
}

export function parseIsoDuration(duration: string): number | null {
  const match = /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/.exec(duration);
  if (!match || duration === "P" || duration.endsWith("T")) return null;
  const [, d, h, m, s] = match;
  return (
    Number(d ?? 0) * 86400 +
    Number(h ?? 0) * 3600 +
    Number(m ?? 0) * 60 +
    Number(s ?? 0)
  );
}

function blocksKorea(restriction: YoutubeVideo["regionRestriction"]): boolean {
  if (!restriction) return false;
  if (restriction.blocked?.includes("KR")) return true;
  return restriction.allowed !== undefined && !restriction.allowed.includes("KR");
}

export function filterVideo(video: YoutubeVideo): FilterResult {
  const seconds = parseIsoDuration(video.duration);
  if (seconds === null) return { pass: false, reason: "invalid_duration" };
  if (seconds <= SHORT_MAX_SECONDS) return { pass: false, reason: "short" };
  if (video.liveBroadcastContent !== "none") {
    return { pass: false, reason: "live_broadcast" };
  }
  if (seconds > LONG_MIN_SECONDS) return { pass: false, reason: "too_long" };

  const title = video.title.normalize("NFKC");
  const keyword = EXCLUDED_KEYWORDS.exec(title);
  if (keyword) return { pass: false, reason: "keyword", detail: keyword[0] };
  if (INSTRUMENT_PLAY.test(title)) {
    return { pass: false, reason: "keyword", detail: "instrument" };
  }
  const eventKeyword = EVENT_ENGLISH.exec(title);
  if (eventKeyword) {
    return { pass: false, reason: "keyword", detail: eventKeyword[0] };
  }
  const koreanKeyword = matchKoreanKeyword(title);
  if (koreanKeyword) {
    return { pass: false, reason: "keyword", detail: koreanKeyword };
  }

  if (!video.embeddable) return { pass: false, reason: "not_embeddable" };
  if (video.privacyStatus !== "public") return { pass: false, reason: "not_public" };
  if (blocksKorea(video.regionRestriction)) {
    return { pass: false, reason: "region_blocked" };
  }
  if (!hasHangul(video.title)) return { pass: false, reason: "no_hangul" };

  return { pass: true };
}
