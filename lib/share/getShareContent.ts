import "server-only";
import { cache } from "react";
import { supabaseAdmin } from "@/shared/lib/supabase-client";
import { isUuid } from "@/shared/lib/uuid";

export interface ShareVerse {
  id: string;
  reference: string;
  body: string;
  translation: string;
}

export interface ShareSong {
  id: string;
  title: string;
  artist: string;
}

export interface ShareContent {
  verse: ShareVerse;
  song: ShareSong | null;
}

// 곡이 없거나 비활성이면 song이 null이다 — 말씀만 있는 상태로 쓸지 404로 볼지는 호출하는 쪽이 정한다.
export const getShareContent = cache(async (verseId: string, songId: string | null): Promise<ShareContent | null> => {
  if (!isUuid(verseId)) return null;

  const [verseResult, songResult] = await Promise.all([
    supabaseAdmin
      .from("verses")
      .select("id, reference, body, translation")
      .eq("id", verseId.toLowerCase())
      .eq("is_active", true)
      .maybeSingle(),
    songId && isUuid(songId)
      ? supabaseAdmin
          .from("songs")
          .select("id, title, artist")
          .eq("id", songId.toLowerCase())
          .eq("is_active", true)
          .maybeSingle()
      : null,
  ]);

  if (verseResult.error) throw new Error(`공유 말씀 조회 실패: ${verseResult.error.message}`);
  if (!verseResult.data) return null;
  if (songResult?.error) throw new Error(`공유 곡 조회 실패: ${songResult.error.message}`);

  return { verse: verseResult.data, song: songResult?.data ?? null };
});
