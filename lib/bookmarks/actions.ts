"use server";

import { revalidatePath } from "next/cache";
import { changeBookmark, isBookmarked, type BookmarkMode } from "@/lib/bookmarks/bookmarkStore";
import type { BookmarkKind, BookmarkResult, BookmarkStatus } from "@/lib/bookmarks/types";

async function run(kind: BookmarkKind, id: string, mode: BookmarkMode): Promise<BookmarkResult> {
  const result = await changeBookmark(kind, id, mode);
  if (!result.error) revalidatePath("/bookmarks");
  return result;
}

export async function toggleVerseBookmark(verseId: string): Promise<BookmarkResult> {
  return run("verse", verseId, "toggle");
}

export async function toggleSongBookmark(songId: string): Promise<BookmarkResult> {
  return run("song", songId, "toggle");
}

export async function ensureVerseBookmark(verseId: string): Promise<BookmarkResult> {
  return run("verse", verseId, "ensure");
}

export async function ensureSongBookmark(songId: string): Promise<BookmarkResult> {
  return run("song", songId, "ensure");
}

export async function removeVerseBookmark(verseId: string): Promise<BookmarkResult> {
  return run("verse", verseId, "remove");
}

export async function removeSongBookmark(songId: string): Promise<BookmarkResult> {
  return run("song", songId, "remove");
}

export async function getBookmarkStatus(input: {
  verseId?: string;
  songId?: string;
}): Promise<BookmarkStatus> {
  const [verse, song] = await Promise.all([
    isBookmarked("verse", input?.verseId),
    isBookmarked("song", input?.songId),
  ]);
  return { verse, song };
}
