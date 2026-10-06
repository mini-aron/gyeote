"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { GLASS_CARD } from "@/components/glassCard";
import { buildSearchHref, MAX_QUERY_LENGTH, type SearchFilters } from "@/lib/search/searchQuery";
import type { SearchOptions, TagOption } from "@/lib/search/types";

type TagKey = "theme" | "situation" | "mood";

const TESTAMENTS = [
  { key: "old", label: "구약" },
  { key: "new", label: "신약" },
] as const;

export function SearchFilterPanel({ filters, options }: { filters: SearchFilters; options: SearchOptions }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const go = (next: Partial<SearchFilters>) => {
    const href = buildSearchHref({ ...filters, limit: undefined, ...next });
    startTransition(() => router.replace(href, { scroll: false }));
  };

  const toggleTag = (key: TagKey, id: string) => {
    const current = filters[key];
    go({ [key]: current.includes(id) ? current.filter((value) => value !== id) : [...current, id] });
  };

  const booksOfTestament = options.books.filter((book) => book.testament === filters.testament);
  const categories = [...new Set(booksOfTestament.map((book) => book.category))];
  const visibleBooks = filters.category
    ? booksOfTestament.filter((book) => book.category === filters.category)
    : booksOfTestament;

  const hasFilter =
    filters.theme.length + filters.situation.length + filters.mood.length > 0 ||
    Boolean(filters.testament || filters.q);

  return (
    <section className={`${GLASS_CARD} flex flex-col gap-4 px-4 py-4 transition-opacity ${pending ? "opacity-70" : ""}`}>
      {filters.type === "song" && (
        <form
          key={filters.q}
          onSubmit={(event) => {
            event.preventDefault();
            const value = new FormData(event.currentTarget).get("q");
            go({ q: typeof value === "string" ? value.trim() : "" });
          }}
          className="flex gap-2"
        >
          <input
            name="q"
            type="search"
            defaultValue={filters.q}
            maxLength={MAX_QUERY_LENGTH}
            placeholder="곡명이나 아티스트"
            className="min-w-0 flex-1 rounded-xl border border-white/10 bg-white/[0.08] px-3 py-2 text-sm text-[#f4f1ff] outline-none placeholder:text-[#f4f1ff]/40 focus:border-white/30"
          />
          <button
            type="submit"
            className="shrink-0 rounded-xl border border-white/10 bg-white/15 px-3 py-2 text-sm text-[#f4f1ff]"
          >
            검색
          </button>
        </form>
      )}

      {filters.type === "verse" && (
        <FilterGroup label="성경 분류">
          <ChipRow>
            {TESTAMENTS.map((item) => (
              <Chip
                key={item.key}
                selected={filters.testament === item.key}
                onClick={() =>
                  go({
                    testament: filters.testament === item.key ? undefined : item.key,
                    category: undefined,
                    book: undefined,
                    chapter: undefined,
                  })
                }
              >
                {item.label}
              </Chip>
            ))}
          </ChipRow>
          {filters.testament && (
            <ChipRow>
              {categories.map((category) => (
                <Chip
                  key={category}
                  selected={filters.category === category}
                  onClick={() =>
                    go({
                      category: filters.category === category ? undefined : category,
                      book: undefined,
                      chapter: undefined,
                    })
                  }
                >
                  {category}
                </Chip>
              ))}
            </ChipRow>
          )}
          {filters.testament && (
            <ChipRow>
              {visibleBooks.map((book) => (
                <Chip
                  key={book.id}
                  selected={filters.book === book.id}
                  disabled={!book.hasVerses}
                  onClick={() =>
                    go({ book: filters.book === book.id ? undefined : book.id, chapter: undefined })
                  }
                >
                  {book.name}
                </Chip>
              ))}
            </ChipRow>
          )}
          {filters.book && options.chapters.length > 0 && (
            <ChipRow>
              {options.chapters.map((chapter) => (
                <Chip
                  key={chapter}
                  selected={filters.chapter === chapter}
                  onClick={() => go({ chapter: filters.chapter === chapter ? undefined : chapter })}
                >
                  {chapter}장
                </Chip>
              ))}
            </ChipRow>
          )}
        </FilterGroup>
      )}

      <TagGroup label="주제" tags={options.themes} selected={filters.theme} onToggle={(id) => toggleTag("theme", id)} />
      <TagGroup
        label="상황"
        tags={options.situations}
        selected={filters.situation}
        onToggle={(id) => toggleTag("situation", id)}
      />
      {filters.type === "song" && (
        <TagGroup label="분위기" tags={options.moods} selected={filters.mood} onToggle={(id) => toggleTag("mood", id)} />
      )}

      {hasFilter && (
        <button
          type="button"
          onClick={() => startTransition(() => router.replace(buildSearchHref({ type: filters.type }), { scroll: false }))}
          className="self-start text-xs text-[#c9bcff] underline underline-offset-2"
        >
          필터 초기화
        </button>
      )}
    </section>
  );
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs tracking-wide text-[#f4f1ff]/55">{label}</p>
      {children}
    </div>
  );
}

function ChipRow({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap gap-1.5">{children}</div>;
}

function TagGroup({
  label,
  tags,
  selected,
  onToggle,
}: {
  label: string;
  tags: TagOption[];
  selected: string[];
  onToggle: (id: string) => void;
}) {
  if (tags.length === 0) return null;
  return (
    <FilterGroup label={label}>
      <ChipRow>
        {tags.map((tag) => (
          <Chip key={tag.id} selected={selected.includes(tag.id)} onClick={() => onToggle(tag.id)}>
            {tag.name}
          </Chip>
        ))}
      </ChipRow>
    </FilterGroup>
  );
}

function Chip({
  selected,
  disabled = false,
  onClick,
  children,
}: {
  selected: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={selected}
      className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
        selected
          ? "border-[#c9bcff]/60 bg-[#c9bcff]/25 text-[#f4f1ff]"
          : "border-white/10 bg-white/[0.06] text-[#f4f1ff]/75"
      } ${disabled ? "cursor-not-allowed opacity-30" : ""}`}
    >
      {children}
    </button>
  );
}
