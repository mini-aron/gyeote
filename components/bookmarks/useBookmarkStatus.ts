"use client";

import { useEffect, useRef, useState } from "react";
import { useSessionStatus } from "@/components/auth/useSessionStatus";
import { getBookmarkStatus } from "@/lib/bookmarks/actions";
import type { BookmarkState } from "@/lib/bookmarks/types";

interface FetchedStatus {
  verseId?: string;
  verse?: boolean | "unknown";
  songId?: string;
  song?: boolean | "unknown";
}

// 조회에 실패하면 "unknown"으로 두어 버튼이 저장만 하게 한다. null은 조회 중. 곡만 바뀌면(다시 뽑기) 곡 상태만 다시 조회한다.
export function useBookmarkStatus(verseId?: string, songId?: string) {
  const session = useSessionStatus();
  const [fetched, setFetched] = useState<FetchedStatus>({});
  const [prevSession, setPrevSession] = useState(session);
  const requested = useRef<{ verseId?: string; songId?: string }>({});

  if (prevSession !== session) {
    setPrevSession(session);
    if (session !== "member") setFetched({});
  }

  useEffect(() => {
    if (session !== "member") {
      requested.current = {};
      return;
    }
    const needVerse = verseId && requested.current.verseId !== verseId ? verseId : undefined;
    const needSong = songId && requested.current.songId !== songId ? songId : undefined;
    if (!needVerse && !needSong) return;
    if (needVerse) requested.current.verseId = needVerse;
    if (needSong) requested.current.songId = needSong;
    const apply = (result?: { verse: boolean; song: boolean }) => {
      const applyVerse = needVerse && requested.current.verseId === needVerse;
      const applySong = needSong && requested.current.songId === needSong;
      if (!applyVerse && !applySong) return;
      setFetched((prev) => ({
        ...prev,
        ...(applyVerse ? { verseId: needVerse, verse: result?.verse ?? "unknown" } : {}),
        ...(applySong ? { songId: needSong, song: result?.song ?? "unknown" } : {}),
      }));
    };
    getBookmarkStatus({ verseId: needVerse, songId: needSong }).then(apply, () => apply());
  }, [session, verseId, songId]);

  const resolve = (id: string | undefined, fetchedId: string | undefined, value: boolean | "unknown" | undefined): BookmarkState => {
    if (!id || session === "unknown") return null;
    if (session === "guest") return false;
    return fetchedId === id ? (value ?? false) : null;
  };

  return {
    verse: resolve(verseId, fetched.verseId, fetched.verse),
    song: resolve(songId, fetched.songId, fetched.song),
  };
}
