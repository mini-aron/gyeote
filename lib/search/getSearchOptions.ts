import "server-only";
import { supabaseAdmin } from "@/shared/lib/supabase-client";
import { fetchAllRows } from "@/lib/search/fetchAllRows";
import type { SearchFilters } from "@/lib/search/searchQuery";
import type { BookOption, SearchOptions, TagOption } from "@/lib/search/types";

async function readTags(table: "themes" | "situations" | "moods"): Promise<TagOption[]> {
  const { data, error } = await supabaseAdmin.from(table).select("id, name").order("name");
  if (error) throw error;
  return (data ?? []) as TagOption[];
}

async function readBooks(): Promise<Omit<BookOption, "hasVerses">[]> {
  const { data, error } = await supabaseAdmin
    .from("bible_books")
    .select("id, name, testament, category")
    .order("id");
  if (error) throw error;
  return (data ?? []) as Omit<BookOption, "hasVerses">[];
}

export async function getSearchOptions(filters: SearchFilters): Promise<SearchOptions> {
  const isVerse = filters.type === "verse";
  const [themes, situations, moods, books, verseRows] = await Promise.all([
    readTags("themes"),
    readTags("situations"),
    isVerse ? Promise.resolve([]) : readTags("moods"),
    isVerse ? readBooks() : Promise.resolve([]),
    isVerse
      ? fetchAllRows<{ book_id: number; chapter: number }>((from, to) =>
          supabaseAdmin
            .from("verses")
            .select("book_id, chapter")
            .eq("is_reviewed", true)
            .eq("is_active", true)
            .order("id")
            .range(from, to),
        )
      : Promise.resolve([]),
  ]);

  const chaptersByBook = new Map<number, Set<number>>();
  for (const row of verseRows) {
    const set = chaptersByBook.get(row.book_id) ?? new Set<number>();
    set.add(row.chapter);
    chaptersByBook.set(row.book_id, set);
  }

  return {
    themes,
    situations,
    moods,
    books: books.map((book) => ({ ...book, hasVerses: chaptersByBook.has(book.id) })),
    chapters: filters.book ? [...(chaptersByBook.get(filters.book) ?? [])].sort((a, b) => a - b) : [],
  };
}
