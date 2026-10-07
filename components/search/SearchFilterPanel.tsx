"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { GLASS_CARD } from "@/components/glassCard";
import { buildSearchHref, MAX_QUERY_LENGTH, type SearchFilters } from "@/lib/search/searchQuery";
import type { SearchOptions, TagOption } from "@/lib/search/types";

type TagKey = "theme" | "situation" | "mood";

const FILTER_DEBOUNCE_MS = 250;

const TESTAMENTS = [
  { key: "old", label: "구약" },
  { key: "new", label: "신약" },
] as const;

const TABS = [
  { key: "verse", label: "말씀" },
  { key: "song", label: "찬양" },
] as const;

export function SearchFilterPanel({ filters, options }: { filters: SearchFilters; options: SearchOptions }) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancel = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  }, []);

  const schedule = useCallback(
    (run: () => void) => {
      cancel();
      timer.current = setTimeout(() => {
        timer.current = null;
        run();
      }, FILTER_DEBOUNCE_MS);
    },
    [cancel],
  );

  const isScheduled = useCallback(() => timer.current !== null, []);

  return (
    <>
      <div role="tablist" className={`${GLASS_CARD} flex p-1 text-sm`}>
        {TABS.map((tab) => (
          <Link
            key={tab.key}
            href={buildSearchHref({ type: tab.key })}
            role="tab"
            aria-selected={filters.type === tab.key}
            replace
            scroll={false}
            onClick={cancel}
            className={`flex-1 rounded-xl py-2 text-center transition-colors ${
              filters.type === tab.key ? "bg-white/15 text-[#f4f1ff]" : "text-[#f4f1ff]/60"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>
      <FilterBody
        key={filters.type}
        filters={filters}
        options={options}
        schedule={schedule}
        cancel={cancel}
        isScheduled={isScheduled}
      />
    </>
  );
}

interface FilterBodyProps {
  filters: SearchFilters;
  options: SearchOptions;
  schedule: (run: () => void) => void;
  cancel: () => void;
  isScheduled: () => boolean;
}

function FilterBody({ filters, options, schedule, cancel, isScheduled }: FilterBodyProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [draft, setDraft] = useState(filters);
  const draftRef = useRef(filters);
  const targetHref = useRef(buildSearchHref({ ...filters, limit: undefined }));

  const push = (next: SearchFilters) => {
    const href = buildSearchHref({ ...next, limit: undefined });
    if (href === targetHref.current) return;
    targetHref.current = href;
    startTransition(() => router.replace(href, { scroll: false }));
  };

  // 서버가 내려준 값이 바뀌면(뒤로가기·전환 완료) 초안을 맞추되, 입력 대기 중이거나 이동 중이면 건드리지 않는다.
  useEffect(() => {
    if (isScheduled() || pending) return;
    targetHref.current = buildSearchHref({ ...filters, limit: undefined });
    draftRef.current = filters;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 입력 대기 여부가 ref라 렌더 중 비교할 수 없다
    setDraft(filters);
  }, [filters, pending, isScheduled]);

  // iOS 스와이프 뒤로가기가 대기 중인 replace에 덮이지 않게 한다.
  useEffect(() => {
    window.addEventListener("popstate", cancel);
    return () => {
      window.removeEventListener("popstate", cancel);
      cancel();
    };
  }, [cancel]);

  const go = (next: Partial<SearchFilters>) => {
    const merged = { ...draftRef.current, ...next };
    draftRef.current = merged;
    setDraft(merged);
    schedule(() => push(draftRef.current));
  };

  const goNow = (next: Partial<SearchFilters>) => {
    const merged = { ...draftRef.current, ...next };
    draftRef.current = merged;
    setDraft(merged);
    cancel();
    push(merged);
  };

  const toggleTag = (key: TagKey, id: string) => {
    const current = draftRef.current[key];
    go({ [key]: current.includes(id) ? current.filter((value) => value !== id) : [...current, id] });
  };

  const booksOfTestament = options.books.filter((book) => book.testament === draft.testament);
  const categories = [...new Set(booksOfTestament.map((book) => book.category))];
  const visibleBooks = draft.category
    ? booksOfTestament.filter((book) => book.category === draft.category)
    : booksOfTestament;

  const hasFilter =
    draft.theme.length + draft.situation.length + draft.mood.length > 0 ||
    Boolean(draft.testament || draft.q);

  return (
    <section className={`${GLASS_CARD} flex flex-col gap-4 px-4 py-4 transition-opacity ${pending ? "opacity-70" : ""}`}>
      {filters.type === "song" && (
        <form
          key={filters.q}
          onSubmit={(event) => {
            event.preventDefault();
            const value = new FormData(event.currentTarget).get("q");
            goNow({ q: typeof value === "string" ? value.trim() : "" });
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
                selected={draft.testament === item.key}
                onClick={() =>
                  go({
                    testament: draft.testament === item.key ? undefined : item.key,
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
          {draft.testament && (
            <ChipRow>
              {categories.map((category) => (
                <Chip
                  key={category}
                  selected={draft.category === category}
                  onClick={() =>
                    go({
                      category: draft.category === category ? undefined : category,
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
          {draft.testament && (
            <ChipRow>
              {visibleBooks.map((book) => (
                <Chip
                  key={book.id}
                  selected={draft.book === book.id}
                  disabled={!book.hasVerses}
                  onClick={() =>
                    go({ book: draft.book === book.id ? undefined : book.id, chapter: undefined })
                  }
                >
                  {book.name}
                </Chip>
              ))}
            </ChipRow>
          )}
          {draft.book && draft.book === filters.book && options.chapters.length > 0 && (
            <ChipRow>
              {options.chapters.map((chapter) => (
                <Chip
                  key={chapter}
                  selected={draft.chapter === chapter}
                  onClick={() => go({ chapter: draft.chapter === chapter ? undefined : chapter })}
                >
                  {chapter}장
                </Chip>
              ))}
            </ChipRow>
          )}
        </FilterGroup>
      )}

      <TagGroup label="주제" tags={options.themes} selected={draft.theme} onToggle={(id) => toggleTag("theme", id)} />
      <TagGroup
        label="상황"
        tags={options.situations}
        selected={draft.situation}
        onToggle={(id) => toggleTag("situation", id)}
      />
      {filters.type === "song" && (
        <TagGroup label="분위기" tags={options.moods} selected={draft.mood} onToggle={(id) => toggleTag("mood", id)} />
      )}

      {hasFilter && (
        <button
          type="button"
          onClick={() => {
            goNow({ theme: [], situation: [], mood: [], testament: undefined, category: undefined, book: undefined, chapter: undefined, q: "" });
          }}
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
