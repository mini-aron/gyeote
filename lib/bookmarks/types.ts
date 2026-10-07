import type { VerseResult } from "@/lib/recommend/types";

export type BookmarkKind = "verse" | "song";

// null은 조회 중, "unknown"은 조회에 실패해 모르는 상태.
export type BookmarkState = boolean | null | "unknown";

export type BookmarkErrorCode = "unauthorized" | "consent" | "invalid" | "failed";

export interface BookmarkResult {
  bookmarked: boolean;
  error?: BookmarkErrorCode;
}

export interface BookmarkStatus {
  verse: boolean;
  song: boolean;
}

export interface BookmarkedVerse extends VerseResult {
  isActive: boolean;
}

export interface BookmarkedSong {
  id: string;
  title: string;
  artist: string;
  listenUrl: string | null;
  isActive: boolean;
}
