"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useLoginSheet } from "@/components/auth/LoginSheetContext";
import { useSessionStatus } from "@/components/auth/useSessionStatus";
import {
  ensureSongBookmark,
  ensureVerseBookmark,
  toggleSongBookmark,
  toggleVerseBookmark,
} from "@/lib/bookmarks/actions";
import { buildResumeParam } from "@/lib/bookmarks/pendingResult";
import type { BookmarkKind, BookmarkState } from "@/lib/bookmarks/types";

interface BookmarkButtonProps {
  kind: BookmarkKind;
  id: string;
  initialBookmarked: BookmarkState;
  onBeforeLogin?: () => void;
}

export function BookmarkButton({ kind, id, initialBookmarked, onBeforeLogin }: BookmarkButtonProps) {
  const status = useSessionStatus();
  const { open } = useLoginSheet();
  const pathname = usePathname();
  const router = useRouter();
  const [bookmarked, setBookmarked] = useState(initialBookmarked === true);
  const busy = useRef(false);
  const adopted = useRef(false);

  useEffect(() => {
    // null(조회 중)과 "unknown"(조회 실패)은 낡은 값을 보여주지 않도록 미저장으로 비워 둔다.
    if (busy.current) return;
    adopted.current = false;
    setBookmarked(initialBookmarked === true);
  }, [initialBookmarked, id]);

  const loading = initialBookmarked === null && status !== "guest";

  const openLogin = () => {
    onBeforeLogin?.();
    open({
      next: `${pathname}?resume=${buildResumeParam(kind, id)}`,
      reason: "bookmark",
    });
  };

  const handleClick = async () => {
    if (status === "guest") {
      openLogin();
      return;
    }
    if (busy.current || loading) return;
    busy.current = true;
    const previous = bookmarked;
    // 상태를 모르면 이미 저장된 북마크를 지우지 않도록 저장만 한다.
    const saveOnly = initialBookmarked === "unknown" && !adopted.current;
    setBookmarked(saveOnly ? true : !previous);
    try {
      const run = saveOnly
        ? kind === "verse" ? ensureVerseBookmark : ensureSongBookmark
        : kind === "verse" ? toggleVerseBookmark : toggleSongBookmark;
      const result = await run(id);
      if (result.error === "unauthorized") {
        setBookmarked(previous);
        openLogin();
      } else if (result.error === "consent") {
        setBookmarked(previous);
        router.push(`/welcome?next=${encodeURIComponent(pathname)}`);
      } else if (result.error) {
        setBookmarked(previous);
      } else {
        adopted.current = true;
        setBookmarked(result.bookmarked);
      }
    } catch {
      setBookmarked(previous);
    } finally {
      busy.current = false;
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      aria-busy={loading}
      aria-pressed={bookmarked}
      aria-label={bookmarked ? "북마크 해제" : "북마크에 저장"}
      className={`-m-2 shrink-0 rounded-full p-2 text-[#c9bcff] transition-colors hover:bg-white/10 ${loading ? "opacity-40" : ""}`}
    >
      <svg
        viewBox="0 0 24 24"
        width="20"
        height="20"
        fill={bookmarked ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M6 3.5h12a.5.5 0 0 1 .5.5v17l-6.5-4.5L5.5 21V4a.5.5 0 0 1 .5-.5Z" />
      </svg>
    </button>
  );
}
