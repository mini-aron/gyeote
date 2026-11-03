import "server-only";
import { supabaseAdmin } from "@/shared/lib/supabase-client";

export async function canViewLyrics(userId: string): Promise<boolean> {
  const [viewer, admin] = await Promise.all([
    supabaseAdmin.from("lyrics_viewers").select("user_id").eq("user_id", userId).maybeSingle(),
    supabaseAdmin.from("admins").select("user_id").eq("user_id", userId).maybeSingle(),
  ]);
  // 조회 실패는 권한 없음으로 본다 — 가사를 잘못 노출하는 쪽보다 안전하다
  return Boolean((!viewer.error && viewer.data) || (!admin.error && admin.data));
}

export async function getSongLyrics(songId: string): Promise<string | null> {
  const { data, error } = await supabaseAdmin
    .from("song_lyrics")
    .select("lyrics")
    .eq("song_id", songId)
    .eq("status", "found")
    .maybeSingle();
  if (error) throw error;
  return data?.lyrics ?? null;
}
