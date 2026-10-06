import "server-only";
import { supabaseAdmin } from "@/shared/lib/supabase-client";
import { readBookmarkedIds } from "@/lib/bookmarks/bookmarkStore";
import type { BookmarkedSong, BookmarkedVerse } from "@/lib/bookmarks/types";

export async function getBookmarkedVerses(): Promise<BookmarkedVerse[]> {
  const ids = await readBookmarkedIds("verse");
  if (!ids?.length) return [];
  const { data } = await supabaseAdmin
    .from("verses")
    .select("id, reference, body, translation, is_active")
    .in("id", ids);
  const byId = new Map((data ?? []).map((row) => [row.id as string, row]));
  return ids.flatMap((id) => {
    const row = byId.get(id);
    return row
      ? [{ id, reference: row.reference, body: row.body, translation: row.translation, isActive: row.is_active }]
      : [];
  });
}

export async function getBookmarkedSongs(): Promise<BookmarkedSong[]> {
  const ids = await readBookmarkedIds("song");
  if (!ids?.length) return [];
  const { data } = await supabaseAdmin
    .from("songs")
    .select("id, title, artist, listen_url, is_active")
    .in("id", ids);
  const byId = new Map((data ?? []).map((row) => [row.id as string, row]));
  return ids.flatMap((id) => {
    const row = byId.get(id);
    return row
      ? [{ id, title: row.title, artist: row.artist, listenUrl: row.listen_url, isActive: row.is_active }]
      : [];
  });
}
