import "server-only";
import { getBibleBooks, getTagOptions, getVerseChapterIndex } from "@/lib/catalog/catalogCache";
import type { SearchFilters } from "@/lib/search/searchQuery";
import type { SearchOptions } from "@/lib/search/types";

export async function getSearchOptions(filters: SearchFilters): Promise<SearchOptions> {
  const isVerse = filters.type === "verse";
  const [themes, situations, moods, books, chapterIndex] = await Promise.all([
    getTagOptions("themes"),
    getTagOptions("situations"),
    isVerse ? Promise.resolve([]) : getTagOptions("moods"),
    isVerse ? getBibleBooks() : Promise.resolve([]),
    isVerse ? getVerseChapterIndex() : Promise.resolve({} as Record<string, number[]>),
  ]);

  return {
    themes,
    situations,
    moods,
    books: books.map((book) => ({ ...book, hasVerses: String(book.id) in chapterIndex })),
    chapters: filters.book ? [...(chapterIndex[String(filters.book)] ?? [])] : [],
  };
}
