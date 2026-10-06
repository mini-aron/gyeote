"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useLoginSheet } from "@/components/auth/LoginSheetContext";
import { useSessionStatus } from "@/components/auth/useSessionStatus";
import {
  getBookmarkStatus,
  toggleSongBookmark,
  toggleVerseBookmark,
} from "@/lib/bookmarks/actions";
import { buildResumeParam } from "@/lib/bookmarks/pendingResult";
import type { BookmarkKind } from "@/lib/bookmarks/types";

interface BookmarkButtonProps {
  kind: BookmarkKind;
  id: string;
  onBeforeLogin?: () => void;
}

export function BookmarkButton({ kind, id, onBeforeLogin }: BookmarkButtonProps) {
  const status = useSessionStatus();
  const { open } = useLoginSheet();
  const pathname = usePathname();
  const router = useRouter();
  const [bookmarked, setBookmarked] = useState(false);
  const busy = useRef(false);

  useEffect(() => {
    if (status !== "member") return;
    let active = true;
    const input = kind === "verse" ? { verseId: id } : { songId: id };
    void getBookmarkStatus(input).then((result) => {
      if (active && !busy.current) setBookmarked(result[kind]);
    });
    return () => {
      active = false;
    };
  }, [status, kind, id]);

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
    if (busy.current) return;
    busy.current = true;
    const previous = bookmarked;
    setBookmarked(!previous);
    try {
      const result = await (kind === "verse" ? toggleVerseBookmark(id) : toggleSongBookmark(id));
      if (result.error === "unauthorized") {
        setBookmarked(previous);
        openLogin();
      } else if (result.error === "consent") {
        setBookmarked(previous);
        router.push(`/welcome?next=${encodeURIComponent(pathname)}`);
      } else if (result.error) {
        setBookmarked(previous);
      } else {
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
      aria-pressed={bookmarked}
      aria-label={bookmarked ? "북마크 해제" : "북마크에 저장"}
      className="-m-2 shrink-0 rounded-full p-2 text-[#c9bcff] transition-colors hover:bg-white/10"
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
