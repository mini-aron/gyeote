import type { VerseResult } from "@/lib/recommend/types";

export type BookmarkKind = "verse" | "song";

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
