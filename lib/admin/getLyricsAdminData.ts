import "server-only";
import { supabaseAdmin } from "@/shared/lib/supabase-client";

export interface LyricsStats {
  found: number;
  ambiguous: number;
  notFound: number;
  pending: number;
}

export interface LyricsViewer {
  userId: string;
  email: string | null;
  nickname: string | null;
  createdAt: string;
}

async function countLyrics(status: "found" | "ambiguous" | "not_found"): Promise<number> {
  const { count, error } = await supabaseAdmin
    .from("song_lyrics")
    .select("song_id", { count: "exact", head: true })
    .eq("status", status);
  if (error) throw error;
  return count ?? 0;
}

async function countPending(): Promise<number> {
  const { count, error } = await supabaseAdmin
    .from("songs")
    .select("id, song_lyrics(song_id)", { count: "exact", head: true })
    .eq("is_reviewed", true)
    .eq("is_active", true)
    .is("song_lyrics", null);
  if (error) throw error;
  return count ?? 0;
}

export async function getLyricsStats(): Promise<LyricsStats> {
  const [found, ambiguous, notFound, pending] = await Promise.all([
    countLyrics("found"),
    countLyrics("ambiguous"),
    countLyrics("not_found"),
    countPending(),
  ]);
  return { found, ambiguous, notFound, pending };
}

export async function getLyricsViewers(): Promise<LyricsViewer[]> {
  const { data, error } = await supabaseAdmin
    .from("lyrics_viewers")
    .select("user_id, created_at")
    .order("created_at", { ascending: false });
  if (error) throw error;
  const rows = data ?? [];
  if (rows.length === 0) return [];

  const ids = rows.map((row) => row.user_id as string);
  const [{ data: profiles }, users] = await Promise.all([
    supabaseAdmin.from("profiles").select("user_id, nickname").in("user_id", ids),
    Promise.all(ids.map((id) => supabaseAdmin.auth.admin.getUserById(id))),
  ]);
  const nicknames = new Map((profiles ?? []).map((profile) => [profile.user_id as string, profile.nickname as string]));
  return rows.map((row, index) => ({
    userId: row.user_id,
    email: users[index].data.user?.email ?? null,
    nickname: nicknames.get(row.user_id) ?? null,
    createdAt: row.created_at,
  }));
}
