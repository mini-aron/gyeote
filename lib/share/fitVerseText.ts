import { formatSongLabel } from "@/lib/share/formatSongLabel";

export const CARD_CONTENT_WIDTH = 880;
const VERSE_NUMBER_WIDTH = 64;
const VERSE_MAX_HEIGHT = 940;
const VERSE_LINE_HEIGHT = 1.62;
const VERSE_LINE_GAP_RATIO = 0.3;
const VERSE_FONT_SIZES = [66, 58, 52, 46, 42, 38, 35, 32];
// 한글은 1em 폭이지만 단어 단위 줄바꿈으로 줄마다 여백이 생겨 실제 폭을 줄여서 계산한다.
const WRAP_SAFETY = 0.9;

const SONG_FONT_SIZES = [30, 28, 26, 24];
const ASCII_WIDTH_RATIO = 0.56;

export interface VerseLine {
  number: number | null;
  text: string;
}

export interface VerseFit {
  fontSize: number;
  lineHeight: number;
  numberFontSize: number;
}

export function splitVerseLines(reference: string, body: string): VerseLine[] {
  const lines = body.split("\n").filter((line) => line.trim());
  const start = Number(reference.match(/:(\d+)(?:-\d+)?$/)?.[1]);
  if (lines.length < 2 || !Number.isFinite(start)) return [{ number: null, text: body.trim() }];
  return lines.map((text, index) => ({ number: start + index, text }));
}

function measureWidth(text: string): number {
  let units = 0;
  for (const char of text) units += char.charCodeAt(0) < 0x300 ? ASCII_WIDTH_RATIO : 1;
  return units;
}

export function fitVerseText(lines: VerseLine[]): VerseFit {
  const hasNumbers = lines.some((line) => line.number !== null);
  const textWidth = (hasNumbers ? CARD_CONTENT_WIDTH - VERSE_NUMBER_WIDTH : CARD_CONTENT_WIDTH) * WRAP_SAFETY;

  const fits = (fontSize: number) => {
    const charsPerLine = Math.max(1, Math.floor(textWidth / fontSize));
    const visualLines = lines.reduce(
      (sum, line) => sum + Math.max(1, Math.ceil(measureWidth(line.text) / charsPerLine)),
      0,
    );
    const height = visualLines * fontSize * VERSE_LINE_HEIGHT + (lines.length - 1) * fontSize * VERSE_LINE_GAP_RATIO;
    return height <= VERSE_MAX_HEIGHT;
  };

  const fontSize = VERSE_FONT_SIZES.find(fits) ?? VERSE_FONT_SIZES[VERSE_FONT_SIZES.length - 1];
  return { fontSize, lineHeight: VERSE_LINE_HEIGHT, numberFontSize: Math.round(fontSize * 0.5) };
}

export interface SongLineFit {
  text: string;
  fontSize: number;
}

export function fitSongLine(title: string, artist: string, maxWidth = CARD_CONTENT_WIDTH - 60): SongLineFit {
  const full = formatSongLabel(title, artist);
  const width = measureWidth(full);
  const fontSize = SONG_FONT_SIZES.find((size) => width * size <= maxWidth);
  if (fontSize) return { text: full, fontSize };

  const smallest = SONG_FONT_SIZES[SONG_FONT_SIZES.length - 1];
  const maxUnits = Math.floor(maxWidth / smallest) - 1;
  let text = "";
  let units = 0;
  for (const char of full) {
    const next = units + (char.charCodeAt(0) < 0x300 ? ASCII_WIDTH_RATIO : 1);
    if (next > maxUnits) break;
    text += char;
    units = next;
  }
  return { text: `${text.trimEnd()}…`, fontSize: smallest };
}
