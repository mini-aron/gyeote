import { artistKeys, hasHangul, titleKey } from "./normalizeSong";
import type { IngestChannel, ParsedSong, VideoKind } from "./types";

const EMOJI = /[\p{Extended_Pictographic}\u{1F3FB}-\u{1F3FF}️‍]/gu;
const HASHTAG = /#\S+/g;
const HANGUL_CHAR = /[ㄱ-ㆎ가-힣]/;
const SENTENCE_PUNCT = /[?!…"“”]|\.\.\.|\.$/;
const MAX_CONFIDENT_TITLE_LENGTH = 40;

const KEY_PIECE = /^[A-G][b#]?(?:[-/][A-G][b#]?)*\s*Key$/i;
const DATE_PIECE = /^\(?\d{2}\.\d{2}\.\d{2}\)?$/;
const SUB_PIECE = /(?:^|\s)sub$/i;
const LEAD_PIECE = /^[\u3131-\u318E\uAC00-\uD7A3]{2,4}\s+인도(?:자)?$/;
const MAX_TITLE_LENGTH = 200;

const INLINE_KIND_TAGS: [RegExp, VideoKind][] = [
  [/\(?\s*Official\s+(?:Music\s+)?(?:Video|M\/V|MV)\s*\)?/gi, "mv"],
  [/\bPerformance\s+Video\b/gi, "mv"],
  [/\[\s*(?:MV|M\/V)\s*\]|\(\s*(?:MV|M\/V)\s*\)|\bM\/V\b|\bMV\b|뮤직비디오/g, "mv"],
  [/\(?\s*Official\s+Audio\s*\)?/gi, "audio"],
  [/\(?\s*Studio\s+ver\.?\s*\)?/gi, "audio"],
  [/\(?\s*(?:Official\s+)?Lyrics?\s+Video\s*\)?/gi, "lyric"],
  [/\bAcoustic\s+Live\b|\bLive\s+Clip\b|\(\s*Live\s*\)/gi, "live"],
  [/\(\s*Official\s*\)/gi, "mv"],
];

const SILENT_TAGS = [
  /\(\s*(?:[\u3131-\u318E\uAC00-\uD7A3]{2,4}\s+인도(?:자)?|인도(?:자)?\s*[:：]\s*[\u3131-\u318E\uAC00-\uD7A3]{2,4}|Lead\s*[:：]\s*[^)]{1,30})\s*\)/gi,
  /\(\s*4K\s*\)/gi,
  /\(\s*(?:with|feat\.?|ft\.?)\b[^)]*\)/gi,
  /\(\s*(?:Remaster(?:ed)?|Repraise)\s*\)/gi,
  /\(찬송가\s*\d+장\)/g,
  /공식/g,
];

const QUOTED_TITLE = /^[「『'‘“"]\s*(.+?)\s*[」』'’”"](.*)$/;
const BRACKET = /\[([^\]]*)\]/g;
const PIECE_SPLIT = /\s+[-–—]\s+|\s*\|\s*/;
const MEDLEY_SPLIT = /\s*\+\s*|\s*\/\s*/;

function normalizeSpaces(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function trimEdges(text: string): string {
  return normalizeSpaces(text.replace(/^[\s\-–—/+|·,:]+|[\s\-–—/+|·,:]+$/g, ""));
}

function isTagPiece(piece: string): boolean {
  return (
    KEY_PIECE.test(piece) ||
    DATE_PIECE.test(piece) ||
    SUB_PIECE.test(piece)
  );
}

function detectKind(text: string): { text: string; kind: VideoKind | null } {
  let kind: VideoKind | null = null;
  let result = text;
  for (const [pattern, tagKind] of INLINE_KIND_TAGS) {
    pattern.lastIndex = 0;
    if (pattern.test(result)) {
      kind ??= tagKind;
      pattern.lastIndex = 0;
      result = result.replace(pattern, " ");
    }
  }
  for (const pattern of SILENT_TAGS) result = result.replace(pattern, " ");
  return { text: result, kind };
}

// 한글 구간 뒤에 이어지는 영어 구간을 병기로 분리한다. 괄호 부제 "(시편 121편)"는 한글 구간에 남는다
function splitBilingual(text: string): { title: string; titleAlt: string | null } {
  const wrapped = /^(.*[\u3131-\u318E\uAC00-\uD7A3])\s*\(([^)]*[A-Za-z][^)]*)\)$/.exec(text);
  if (wrapped && !HANGUL_CHAR.test(wrapped[2]) && HANGUL_CHAR.test(wrapped[1])) {
    return { title: trimEdges(wrapped[1]), titleAlt: trimEdges(wrapped[2]) };
  }
  const prefixed = /^([A-Za-z0-9 .'’,!&-]+?)\s*\(([^)]*[ㄱ-ㆎ가-힣][^)]*)\)$/.exec(text);
  if (prefixed) {
    return { title: trimEdges(prefixed[2]), titleAlt: trimEdges(prefixed[1]) };
  }

  const tokens = text.split(" ");
  let lastHangul = -1;
  tokens.forEach((token, i) => {
    if (HANGUL_CHAR.test(token)) lastHangul = i;
  });
  if (lastHangul < 0) return { title: trimEdges(text), titleAlt: null };

  const title = trimEdges(tokens.slice(0, lastHangul + 1).join(" "));
  const alt = trimEdges(tokens.slice(lastHangul + 1).join(" ").replace(/^\((.*)\)$/, "$1"));
  return { title, titleAlt: alt || null };
}

function detectMedley(text: string): boolean {
  const pieces = text.replace(/\([^)]*\)/g, " ").split(MEDLEY_SPLIT).filter((p) => p.trim().length > 0);
  if (pieces.length < 2) return false;
  const hangulPieces = pieces.filter((p) => HANGUL_CHAR.test(p)).length;
  if (hangulPieces > 0) return hangulPieces >= 2;
  return pieces.every((p) => p.trim().length >= 3);
}

export function parseVideoTitle(
  rawTitle: string,
  channel: IngestChannel,
  knownArtistKeys: ReadonlySet<string> = new Set(),
): ParsedSong {
  const original = rawTitle.slice(0, MAX_TITLE_LENGTH).normalize("NFKC");
  const hadDecoration = EMOJI.test(original) || HASHTAG.test(original);
  EMOJI.lastIndex = 0;
  HASHTAG.lastIndex = 0;

  let text = original.replace(EMOJI, " ").replace(HASHTAG, " ");
  text = text.replace(BRACKET, " | $1 | ");

  const detected = detectKind(text);
  text = detected.text;
  const videoKind: VideoKind = detected.kind ?? (channel.kind === "topic" ? "audio" : "unknown");

  let artist: string | null = null;
  let artistKeySet: ReadonlySet<string> = knownArtistKeys;
  let contentPieces: string[];
  let artistPieceFound = false;

  if (channel.kind === "topic") {
    artist = normalizeSpaces(channel.name.normalize("NFKC").replace(/\s+-\s+Topic$/i, ""));
    artistKeySet = new Set(artistKeys(artist));
    contentPieces = [trimEdges(text)];
  } else {
    const quoted = QUOTED_TITLE.exec(text.trim());
    const rest = quoted ? quoted[2] : "";
    const pieces = (quoted ? [quoted[1], ...rest.split(PIECE_SPLIT)] : text.split(PIECE_SPLIT))
      .map(trimEdges)
      .filter((piece) => piece.length > 0 && !isTagPiece(piece));
    const leadPieces = pieces.filter((piece) => LEAD_PIECE.test(piece));

    const wanted =
      channel.kind === "artist" && channel.defaultArtist
        ? new Set(artistKeys(channel.defaultArtist))
        : knownArtistKeys;

    artistKeySet = wanted;
    contentPieces = [];
    for (const piece of pieces) {
      if (LEAD_PIECE.test(piece)) continue;
      const key = titleKey(piece);
      if (!artist && wanted.has(key)) {
        artist = channel.kind === "artist" ? (channel.defaultArtist ?? piece) : piece;
        artistPieceFound = true;
      } else if (wanted.has(key)) {
        artistPieceFound = true;
      } else {
        contentPieces.push(piece);
      }
    }
    // "나의 인도자"처럼 곡명이 인도자 표기와 겹치면 되살린다
    if (!contentPieces.some((piece) => HANGUL_CHAR.test(piece))) {
      contentPieces.push(...leadPieces);
    }
    if (!artist && channel.kind === "artist") artist = channel.defaultArtist;
  }

  contentPieces = contentPieces.map((piece) =>
    normalizeSpaces(
      piece.replace(/\(([^)]*)\)/g, (match, inner: string) =>
        artistKeySet.has(titleKey(inner)) ? " " : match,
      ),
    ),
  );

  const hangulPieces = contentPieces.filter((p) => HANGUL_CHAR.test(p));
  const englishPieces = contentPieces.filter((p) => !HANGUL_CHAR.test(p));
  const titlePiece = hangulPieces[0] ?? englishPieces[0] ?? "";

  const isMedley = detectMedley(titlePiece);
  const split = splitBilingual(titlePiece);
  const title = split.title;
  const titleAlt = split.titleAlt ?? (hangulPieces.length > 0 ? (englishPieces[0] ?? null) : (englishPieces[1] ?? null));

  const isTopic = channel.kind === "topic";
  let confident = title.length > 0 && artist !== null;
  if (!isTopic) {
    if (hangulPieces.length > 1) confident = false;
    if (hadDecoration) confident = false;
    if (title.length > MAX_CONFIDENT_TITLE_LENGTH || SENTENCE_PUNCT.test(title)) {
      confident = false;
    }
    if (channel.kind === "label" && !artistPieceFound) confident = false;
  }
  if (/부제/.test(original)) confident = false;
  if (!hasHangul(title) && title.length > 0 && !isTopic) confident = false;

  return { title, titleAlt, artist, videoKind, isMedley, confident };
}
