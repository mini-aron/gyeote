import { PSALMS_BOOK_ID } from "@/lib/search/parseReference";
import type { SearchFilters } from "@/lib/search/searchQuery";
import type { SearchOptions } from "@/lib/search/types";

export interface ActiveFilterChip {
  key: string;
  label: string;
  remove: Partial<SearchFilters>;
}

const TESTAMENT_LABEL = { old: "구약", new: "신약" } as const;

function scopeChip(filters: SearchFilters, options: SearchOptions): ActiveFilterChip | null {
  const bookName = options.books.find((book) => book.id === filters.book)?.name;
  if (filters.chapter && bookName) {
    const unit = filters.book === PSALMS_BOOK_ID ? "편" : "장";
    return { key: "chapter", label: `${bookName} ${filters.chapter}${unit}`, remove: { chapter: undefined } };
  }
  if (filters.book && bookName) {
    return { key: "book", label: bookName, remove: { book: undefined, chapter: undefined } };
  }
  if (filters.category) {
    return { key: "category", label: filters.category, remove: { category: undefined, book: undefined, chapter: undefined } };
  }
  if (filters.testament) {
    return {
      key: "testament",
      label: TESTAMENT_LABEL[filters.testament],
      remove: { testament: undefined, category: undefined, book: undefined, chapter: undefined },
    };
  }
  return null;
}

// 성경 범위는 가장 좁은 단계 하나만 칩으로 보여주고, 지우면 한 단계씩 넓어진다.
export function activeFilterChips(filters: SearchFilters, options: SearchOptions): ActiveFilterChip[] {
  const chips: ActiveFilterChip[] = [];
  if (filters.bookmarked) chips.push({ key: "bookmarked", label: "북마크", remove: { bookmarked: false } });
  const scope = scopeChip(filters, options);
  if (scope) chips.push(scope);

  const groups = [
    { key: "theme", ids: filters.theme, tags: options.themes },
    { key: "situation", ids: filters.situation, tags: options.situations },
    { key: "mood", ids: filters.mood, tags: options.moods },
  ] as const;
  for (const group of groups) {
    for (const id of group.ids) {
      const name = group.tags.find((tag) => tag.id === id)?.name;
      if (!name) continue;
      chips.push({ key: `${group.key}:${id}`, label: name, remove: { [group.key]: group.ids.filter((value) => value !== id) } });
    }
  }
  return chips;
}
