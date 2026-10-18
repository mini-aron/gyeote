import "server-only";
import { supabaseAdmin } from "@/shared/lib/supabase-client";
import { isUuid } from "@/shared/lib/uuid";
import { HIDDEN_SITUATIONS } from "@/lib/search/getSearchOptions";

export interface SongDetail {
  id: string;
  title: string;
  artist: string;
  listenUrl: string | null;
  summary: string | null;
  youtubeVideoId: string | null;
  tags: string[];
}

interface RawSongDetailRow {
  id: string;
  title: string;
  artist: string;
  listen_url: string | null;
  summary: string | null;
  youtube_video_id: string | null;
  video_unavailable_at: string | null;
  song_themes: { themes: { name: string } | null }[] | null;
  song_situations: { situations: { name: string } | null }[] | null;
  song_moods: { moods: { name: string } | null }[] | null;
}

const YOUTUBE_VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;

export async function getSongDetail(id: string): Promise<SongDetail | null> {
  if (!isUuid(id)) return null;
  const { data, error } = await supabaseAdmin
    .from("songs")
    .select(
      "id, title, artist, listen_url, summary, youtube_video_id, video_unavailable_at, song_themes(themes(name)), song_situations(situations(name)), song_moods(moods(name))",
    )
    .eq("id", id)
    .eq("is_reviewed", true)
    .eq("is_active", true)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const row = data as unknown as RawSongDetailRow;
  const videoId = row.youtube_video_id;
  const playable = !row.video_unavailable_at && videoId !== null && YOUTUBE_VIDEO_ID_PATTERN.test(videoId);
  const tags = [
    ...(row.song_themes ?? []).map((link) => link.themes?.name),
    ...(row.song_situations ?? []).map((link) => link.situations?.name).filter((name) => !HIDDEN_SITUATIONS.has(name ?? "")),
    ...(row.song_moods ?? []).map((link) => link.moods?.name),
  ].filter((name): name is string => Boolean(name));

  return {
    id: row.id,
    title: row.title,
    artist: row.artist,
    listenUrl: row.listen_url,
    summary: row.summary,
    youtubeVideoId: playable ? videoId : null,
    tags: [...new Set(tags)],
  };
}
