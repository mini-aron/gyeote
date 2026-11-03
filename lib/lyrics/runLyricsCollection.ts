import "server-only";
import { supabaseAdmin } from "@/shared/lib/supabase-client";
import { fetchGasazipLyrics, searchGasazip } from "@/lib/lyrics/gasazipSource";
import { pickLyricsMatch, type LyricsMatch } from "@/lib/lyrics/matchSong";

// 한 사이트를 연달아 두드리지 않도록 요청 사이에 쉰다
const REQUEST_INTERVAL_MS = 1_000;
const BATCH_SIZE = 200;
const MAX_CONSECUTIVE_FAILURES = 5;

export interface LyricsCollectionSummary {
  processed: number;
  found: number;
  ambiguous: number;
  notFound: number;
  failed: number;
  stoppedEarly: boolean;
}

interface PendingSong {
  id: string;
  title: string;
  artist: string;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function readPendingSongs(): Promise<PendingSong[]> {
  const { data, error } = await supabaseAdmin
    .from("songs")
    .select("id, title, artist, song_lyrics(song_id)")
    .eq("is_reviewed", true)
    .eq("is_active", true)
    .is("song_lyrics", null)
    .order("id")
    .limit(BATCH_SIZE);
  if (error) throw error;
  return (data ?? []).map(({ id, title, artist }) => ({ id, title, artist }));
}

async function findMatch(song: PendingSong): Promise<LyricsMatch> {
  const first = pickLyricsMatch(song, await searchGasazip(`${song.title} ${song.artist}`));
  if (first.status === "found") return first;
  await sleep(REQUEST_INTERVAL_MS);
  // 가수 표기가 달라 함께 검색하면 안 걸리는 곡이 있어 제목만으로 한 번 더 찾는다
  const second = pickLyricsMatch(song, await searchGasazip(song.title));
  return second.status === "not_found" ? first : second;
}

export async function runLyricsCollection({ deadline }: { deadline: number }): Promise<LyricsCollectionSummary> {
  const summary: LyricsCollectionSummary = { processed: 0, found: 0, ambiguous: 0, notFound: 0, failed: 0, stoppedEarly: false };
  let consecutiveFailures = 0;

  for (const song of await readPendingSongs()) {
    if (Date.now() >= deadline || consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
      summary.stoppedEarly = true;
      break;
    }
    try {
      const match = await findMatch(song);
      let lyrics: string | null = null;
      if (match.status === "found") {
        await sleep(REQUEST_INTERVAL_MS);
        lyrics = await fetchGasazipLyrics(match.ref);
      }
      // 중복 실행이나 관리자가 먼저 넣은 행을 덮어쓰지 않는다
      const { error } = await supabaseAdmin.from("song_lyrics").upsert({
        song_id: song.id,
        status: match.status,
        lyrics,
        source: "gasazip",
        source_ref: match.status === "not_found" ? null : match.ref,
        fetched_at: new Date().toISOString(),
      }, { onConflict: "song_id", ignoreDuplicates: true });
      if (error) throw error;
      summary[match.status === "found" ? "found" : match.status === "ambiguous" ? "ambiguous" : "notFound"] += 1;
      consecutiveFailures = 0;
    } catch (error) {
      // 실패한 곡은 행을 남기지 않아 다음 실행에서 다시 시도된다
      summary.failed += 1;
      consecutiveFailures += 1;
      console.error("[lyrics] 수집 실패:", error instanceof Error ? error.message : "unknown");
    }
    summary.processed += 1;
    await sleep(REQUEST_INTERVAL_MS);
  }
  return summary;
}
