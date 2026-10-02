import type { VerseResult, SongResult } from "@/lib/recommend/types";

// F-09 규칙: 뒤뜰에 쓴 글과 대화·응원의 글은 공유에 포함하지 않는다 — 말씀 + 찬양만.
export function buildShareText(verse: VerseResult | null, song: SongResult | null): string {
  return [
    verse ? `${verse.reference} — ${verse.body}` : null,
    song ? `${song.title} · ${song.artist}` : null,
  ]
    .filter((line): line is string => Boolean(line))
    .join("\n");
}
