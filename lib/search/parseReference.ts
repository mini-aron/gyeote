export interface ParsedReference {
  bookId: number;
  chapter?: number;
  verse?: number;
}

const MAX_CHAPTER = 150;
const MAX_VERSE = 176;

// "23", "23:1", "23 1", "23장 1절", "3장16절", "23편", "23:1-5"(끝 절은 무시) — 장과 절 사이엔 구분자가 있어야 "1191"을 119:1로 읽지 않는다
const CHAPTER_VERSE =
  /^(\d{1,3})(?:(?:\s*(?:장|편)\s*|\s*[:.]\s*|\s+)(\d{1,3})(?:\s*[-~]\s*\d{1,3})?(?:\s*절)?|\s*(?:장|편))?$/;

export function parseReference(query: string, books: { id: number; name: string }[]): ParsedReference | null {
  const text = query.normalize("NFC").replace(/：/g, ":").replace(/\s+/g, " ").trim();
  const book = books
    .filter((candidate) => text.startsWith(candidate.name))
    .sort((a, b) => b.name.length - a.name.length)[0];
  if (!book) return null;

  const rest = text.slice(book.name.length).trim();
  if (rest === "") return { bookId: book.id };

  const match = CHAPTER_VERSE.exec(rest);
  if (!match) return null;
  const chapter = Number(match[1]);
  const verse = match[2] === undefined ? undefined : Number(match[2]);
  if (chapter < 1 || chapter > MAX_CHAPTER) return null;
  if (verse !== undefined && (verse < 1 || verse > MAX_VERSE)) return null;
  return verse === undefined ? { bookId: book.id, chapter } : { bookId: book.id, chapter, verse };
}
