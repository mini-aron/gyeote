import "server-only";
import { supabaseAdmin } from "@/shared/lib/supabase-client";
import { buildSongIndex, dedupeKey, matchExistingSong } from "@/lib/ingest/normalizeSong";
import { loadSongs } from "@/lib/ingest/runChannelIngest";
import { hasRequiredTags, readSuggestedTags } from "./candidateInput";
import type {
  AddChannelInput,
  ManualInput,
  RejectInput,
  SaveInput,
  UpdateChannelInput,
} from "./candidateInput";
import type { YoutubeVideo } from "@/lib/ingest/types";
import type { CandidateStatus } from "./types";

const UNIQUE_VIOLATION = "23505";
const STALE_MESSAGE = "다른 곳에서 상태가 바뀌었어요. 화면을 새로고침해 주세요.";
const GENERIC_MESSAGE = "처리하지 못했어요. 잠시 후 다시 시도해 주세요.";

export type StoreResult<T = object> = ({ ok: true } & T) | { ok: false; message: string; candidateId?: string };

type DbError = { code?: string; message: string };

function failure(context: string, error: DbError): { ok: false; message: string } {
  console.error(`[admin] ${context}:`, error.code ?? "", error.message);
  return { ok: false, message: GENERIC_MESSAGE };
}

const now = () => new Date().toISOString();

async function alreadyLinkedMessage(videoId: string | null): Promise<string> {
  if (!videoId) return "이미 다른 곡에 연결된 영상이에요.";
  const { data } = await supabaseAdmin
    .from("songs")
    .select("title")
    .eq("youtube_video_id", videoId)
    .maybeSingle();
  const title = data?.title as string | undefined;
  return title ? `이미 "${title}" 곡에 연결된 영상이에요.` : "이미 다른 곡에 연결된 영상이에요.";
}

export async function saveCandidateRow(
  input: SaveInput,
): Promise<StoreResult<{ status: "parsed" | "tagged" }>> {
  const status = hasRequiredTags(input.tags) ? "tagged" : "parsed";
  const newKey = dedupeKey(input.title, input.artist);
  const patch: Record<string, unknown> = {
    title: input.title,
    artist: input.artist,
    dedupe_key: newKey,
    suggested_tags: input.tags,
    admin_memo: input.memo,
    status,
    updated_at: now(),
  };

  const { data: current, error: readError } = await supabaseAdmin
    .from("song_candidates")
    .select("dedupe_key")
    .eq("id", input.id)
    .eq("status", input.expectedStatus)
    .maybeSingle();
  if (readError) return failure("저장 전 조회", readError);
  if (!current) return { ok: false, message: STALE_MESSAGE };

  if (input.expectedStatus === "new") patch.parse_method = "manual";
  // 키가 그대로면 기존 판정("별개 곡" 확정 포함)을 보존한다
  if (input.expectedStatus === "new" || current.dedupe_key !== newKey) {
    try {
      const index = buildSongIndex(await loadSongs(supabaseAdmin));
      const match = matchExistingSong(index, input.title, input.artist);
      patch.possible_duplicate_song_id = match.kind === "new" ? null : match.songId;
    } catch (error) {
      return failure("기존 곡 조회", { message: error instanceof Error ? error.message : "unknown" });
    }
  }

  const { data, error } = await supabaseAdmin
    .from("song_candidates")
    .update(patch)
    .eq("id", input.id)
    .eq("status", input.expectedStatus)
    .select("id");
  if (error) return failure("후보 저장", error);
  if (data.length === 0) return { ok: false, message: STALE_MESSAGE };
  return { ok: true, status };
}

// 메시지 문자열이 바뀌어도 일반 실패 문구로 떨어지도록, 알 수 있는 것만 변환한다
async function describePromoteError(error: DbError, videoId: string | null): Promise<string> {
  const message = error.message;
  if (error.code === UNIQUE_VIOLATION) return alreadyLinkedMessage(videoId);
  if (/already approved/i.test(message)) return "이미 승인된 같은 곡이 있어요.";
  if (/not approvable/i.test(message)) {
    return "승인 조건을 채우지 못했어요. 영상, 재생 가능 여부, 중복 의심을 확인해 주세요.";
  }
  if (/theme and one mood/i.test(message)) return "주제와 분위기 태그를 1개 이상 골라 주세요.";
  if (/unknown tag/i.test(message)) return "목록에 없는 태그가 들어 있어요. 태그를 다시 골라 주세요.";
  if (/empty title or artist/i.test(message)) return "곡명과 아티스트를 입력해 주세요.";
  return GENERIC_MESSAGE;
}

export async function promoteCandidate(id: string, reviewerId: string): Promise<StoreResult> {
  const { data: candidate, error: readError } = await supabaseAdmin
    .from("song_candidates")
    .select("dedupe_key, youtube_video_id, possible_duplicate_song_id")
    .eq("id", id)
    .maybeSingle();
  if (readError) return failure("승인 전 조회", readError);
  if (!candidate) return { ok: false, message: STALE_MESSAGE };
  if (candidate.possible_duplicate_song_id) {
    return { ok: false, message: "기존 곡과 비슷한 곡이 있어요. 확인 후 승인해 주세요." };
  }

  if (candidate.dedupe_key) {
    const { data: approved, error } = await supabaseAdmin
      .from("song_candidates")
      .select("id")
      .eq("dedupe_key", candidate.dedupe_key)
      .eq("status", "approved")
      .neq("id", id)
      .limit(1);
    if (error) return failure("승인된 같은 곡 조회", error);
    if (approved.length > 0) return { ok: false, message: "이미 승인된 같은 곡이 있어요." };
  }

  const { error } = await supabaseAdmin.rpc("promote_song_candidate", {
    p_candidate_id: id,
    p_reviewer: reviewerId,
  });
  if (error) {
    console.error("[admin] 승인 실패:", error.code ?? "", error.message);
    return { ok: false, message: await describePromoteError(error, candidate.youtube_video_id as string | null) };
  }
  return { ok: true };
}

export async function rejectCandidateRow(input: RejectInput, reviewerId: string): Promise<StoreResult> {
  const { data, error } = await supabaseAdmin
    .from("song_candidates")
    .update({
      status: "rejected",
      reject_reason: input.reason,
      reviewed_by: reviewerId,
      reviewed_at: now(),
      raw_title: null,
      updated_at: now(),
    })
    .eq("id", input.id)
    .eq("status", input.expectedStatus)
    .select("id");
  if (error) return failure("후보 거절", error);
  if (data.length === 0) return { ok: false, message: STALE_MESSAGE };
  return { ok: true };
}

export async function restoreCandidateRow(id: string): Promise<StoreResult> {
  const { data: row, error: readError } = await supabaseAdmin
    .from("song_candidates")
    .select("title, artist, song_id, youtube_video_id")
    .eq("id", id)
    .eq("status", "rejected")
    .maybeSingle();
  if (readError) return failure("복원 전 조회", readError);
  if (!row) return { ok: false, message: STALE_MESSAGE };

  const parsed = Boolean(row.title?.trim()) && Boolean(row.artist?.trim());
  const status: CandidateStatus = row.song_id
    ? "duplicate"
    : !row.youtube_video_id
      ? "needs_video"
      : parsed
        ? "parsed"
        : "new";
  const { data, error } = await supabaseAdmin
    .from("song_candidates")
    .update({
      status,
      reject_reason: null,
      reviewed_by: null,
      reviewed_at: null,
      updated_at: now(),
    })
    .eq("id", id)
    .eq("status", "rejected")
    .select("id");
  if (error) return failure("후보 복원", error);
  if (data.length === 0) return { ok: false, message: STALE_MESSAGE };
  return { ok: true };
}

export async function clearPossibleDuplicate(candidateId: string, songId: string): Promise<StoreResult> {
  const { data, error } = await supabaseAdmin
    .from("song_candidates")
    .update({ possible_duplicate_song_id: null, updated_at: now() })
    .eq("id", candidateId)
    .eq("possible_duplicate_song_id", songId)
    .in("status", ["new", "parsed", "tagged", "needs_video"])
    .select("id");
  if (error) return failure("별개 곡 확정", error);
  if (data.length === 0) return { ok: false, message: STALE_MESSAGE };
  return { ok: true };
}

const LINKABLE_STATUSES = ["parsed", "tagged", "duplicate"];

export async function linkVideoToSong(
  candidateId: string,
  songId: string,
  replace: boolean,
  reviewerId: string,
): Promise<StoreResult> {
  const { data: candidate, error: readError } = await supabaseAdmin
    .from("song_candidates")
    .select("status, youtube_video_id, embeddable, song_id, possible_duplicate_song_id")
    .eq("id", candidateId)
    .maybeSingle();
  if (readError) return failure("연결 전 조회", readError);
  if (!candidate) return { ok: false, message: STALE_MESSAGE };

  const matchesCandidate = candidate.song_id === songId || candidate.possible_duplicate_song_id === songId;
  if (!matchesCandidate || !LINKABLE_STATUSES.includes(candidate.status as string)) {
    return { ok: false, message: STALE_MESSAGE };
  }
  if (!candidate.youtube_video_id || candidate.embeddable !== true) {
    return { ok: false, message: "퍼가기가 허용된 영상만 곡에 연결할 수 있어요." };
  }

  let songUpdate = supabaseAdmin
    .from("songs")
    .update({
      youtube_video_id: candidate.youtube_video_id,
      video_checked_at: now(),
      video_unavailable_at: null,
    })
    .eq("id", songId);
  if (!replace) songUpdate = songUpdate.is("youtube_video_id", null);
  const { data: updatedSongs, error: songError } = await songUpdate.select("id");
  if (songError) {
    if (songError.code === UNIQUE_VIOLATION) {
      return { ok: false, message: await alreadyLinkedMessage(candidate.youtube_video_id as string) };
    }
    return failure("곡 영상 연결", songError);
  }
  if (updatedSongs.length === 0) {
    return { ok: false, message: "이 곡에는 이미 다른 영상이 연결돼 있어요. 바꾸려면 \"영상 교체\"를 눌러 주세요." };
  }

  const { data: updatedCandidates, error } = await supabaseAdmin
    .from("song_candidates")
    .update({
      status: "duplicate",
      song_id: songId,
      possible_duplicate_song_id: null,
      reviewed_by: reviewerId,
      reviewed_at: now(),
      updated_at: now(),
    })
    .eq("id", candidateId)
    .eq("status", candidate.status as string)
    .select("id");
  if (error) return failure("후보 연결 기록", error);
  if (updatedCandidates.length === 0) {
    return { ok: false, message: "영상은 연결됐지만 후보 상태가 바뀌어 있었어요. 화면을 새로고침해 주세요." };
  }
  return { ok: true };
}

const PROMOTABLE_REPRESENTATIVE_STATUSES = ["new", "parsed", "tagged", "rejected"];

function statusForPromoted(current: {
  status: string;
  title: string | null;
  artist: string | null;
  suggested_tags: unknown;
}): CandidateStatus {
  if (current.status !== "rejected") return current.status as CandidateStatus;
  if (!current.title?.trim() || !current.artist?.trim()) return "new";
  return hasRequiredTags(readSuggestedTags(current.suggested_tags)) ? "tagged" : "parsed";
}

// 대체 영상을 먼저 올린다 — 중간에 실패해도 대표가 사라지지 않고(이중 승인은 DB가 막는다)
export async function promoteAlternateVideoRow(currentId: string, alternateId: string): Promise<StoreResult> {
  const { data: rows, error: readError } = await supabaseAdmin
    .from("song_candidates")
    .select(
      "id, status, dedupe_key, title, artist, suggested_tags, summary, admin_memo, possible_duplicate_song_id, parse_method, song_id, embeddable",
    )
    .in("id", [currentId, alternateId]);
  if (readError) return failure("대표 전환 전 조회", readError);

  const current = rows.find((row) => row.id === currentId);
  const alternate = rows.find((row) => row.id === alternateId);
  if (!current || !alternate) return { ok: false, message: STALE_MESSAGE };

  const currentStatus = current.status as string;
  const valid =
    PROMOTABLE_REPRESENTATIVE_STATUSES.includes(currentStatus) &&
    alternate.status === "duplicate" &&
    alternate.song_id === null &&
    current.dedupe_key !== null &&
    current.dedupe_key === alternate.dedupe_key;
  if (!valid) return { ok: false, message: STALE_MESSAGE };
  if (alternate.embeddable !== true) {
    return { ok: false, message: "퍼가기가 허용되지 않는 영상은 대표로 바꿀 수 없어요." };
  }

  const { data: promoted, error: promoteError } = await supabaseAdmin
    .from("song_candidates")
    .update({
      status: statusForPromoted(current),
      title: current.title,
      artist: current.artist,
      dedupe_key: current.dedupe_key,
      suggested_tags: current.suggested_tags,
      summary: current.summary,
      admin_memo: current.admin_memo,
      possible_duplicate_song_id: current.possible_duplicate_song_id,
      parse_method: current.parse_method,
      updated_at: now(),
    })
    .eq("id", alternateId)
    .eq("status", "duplicate")
    .select("id");
  if (promoteError) return failure("새 대표 승격", promoteError);
  if (promoted.length === 0) return { ok: false, message: STALE_MESSAGE };

  const { data: demoted, error: demoteError } = await supabaseAdmin
    .from("song_candidates")
    .update({ status: "duplicate", updated_at: now() })
    .eq("id", currentId)
    .eq("status", currentStatus)
    .select("id");
  if (demoteError || demoted.length === 0) {
    const { data: reverted, error: revertError } = await supabaseAdmin
      .from("song_candidates")
      .update({ status: "duplicate", updated_at: now() })
      .eq("id", alternateId)
      .eq("status", statusForPromoted(current))
      .select("id");
    if (revertError || reverted.length === 0) {
      console.error("[admin] 대표 전환 보상 실패 — 대표가 둘로 남았을 수 있어요:", currentId, alternateId);
    }
    return demoteError ? failure("기존 대표 강등", demoteError) : { ok: false, message: STALE_MESSAGE };
  }
  return { ok: true };
}

export async function insertChannel(
  input: AddChannelInput,
  channel: { youtubeChannelId: string; name: string; uploadsPlaylistId: string },
): Promise<StoreResult> {
  const { error } = await supabaseAdmin.from("ingest_channels").insert({
    youtube_channel_id: channel.youtubeChannelId,
    uploads_playlist_id: channel.uploadsPlaylistId,
    name: channel.name,
    kind: input.kind,
    default_artist: input.defaultArtist,
  });
  if (error) {
    if (error.code === UNIQUE_VIOLATION) return { ok: false, message: "이미 등록된 채널이에요." };
    return failure("채널 추가", error);
  }
  return { ok: true };
}

export async function updateChannelRow(input: UpdateChannelInput): Promise<StoreResult> {
  const patch: Record<string, unknown> = {
    status: input.status,
    kind: input.kind,
    default_artist: input.defaultArtist,
  };
  if (input.status === "tracking") {
    patch.fail_count = 0;
    patch.last_error = null;
  }
  const { data, error } = await supabaseAdmin
    .from("ingest_channels")
    .update(patch)
    .eq("id", input.id)
    .select("id");
  if (error) return failure("채널 수정", error);
  if (data.length === 0) return { ok: false, message: "채널을 찾을 수 없어요." };
  return { ok: true };
}

async function findCandidateIdByVideo(videoId: string): Promise<string | undefined> {
  const { data } = await supabaseAdmin
    .from("song_candidates")
    .select("id")
    .eq("youtube_video_id", videoId)
    .maybeSingle();
  return (data?.id as string | undefined) ?? undefined;
}

export async function checkVideoUnused(
  videoId: string,
  selfId?: string,
): Promise<{ ok: false; message: string; candidateId?: string } | null> {
  const { data: song, error } = await supabaseAdmin
    .from("songs")
    .select("title")
    .eq("youtube_video_id", videoId)
    .maybeSingle();
  if (error) return failure("영상 사용 여부 조회", error);
  if (song) return { ok: false, message: `이미 "${song.title as string}" 곡에 연결된 영상이에요.` };

  const existingId = await findCandidateIdByVideo(videoId);
  if (existingId && existingId !== selfId) {
    return { ok: false, message: "이미 후보에 있는 영상이에요.", candidateId: existingId };
  }
  return null;
}

const SAME_KEY_STATUSES = ["new", "parsed", "tagged", "approved"];

async function countSameKeyCandidates(key: string | null): Promise<number | { error: DbError }> {
  if (!key) return 0;
  const { count, error } = await supabaseAdmin
    .from("song_candidates")
    .select("id", { count: "exact", head: true })
    .eq("dedupe_key", key)
    .in("status", SAME_KEY_STATUSES);
  return error ? { error } : (count ?? 0);
}

export async function insertManualCandidate(
  input: ManualInput,
  video: YoutubeVideo | null,
): Promise<StoreResult<{ candidateId: string; hasPossibleDuplicate: boolean; sameKeyCandidates: number }>> {
  const key = dedupeKey(input.title, input.artist);
  let possibleDuplicateSongId: string | null = null;
  try {
    const match = matchExistingSong(buildSongIndex(await loadSongs(supabaseAdmin)), input.title, input.artist);
    if (match.kind !== "new") possibleDuplicateSongId = match.songId;
  } catch (error) {
    return failure("기존 곡 조회", { message: error instanceof Error ? error.message : "unknown" });
  }

  const sameKeyCandidates = await countSameKeyCandidates(key);
  if (typeof sameKeyCandidates !== "number") return failure("같은 곡 후보 조회", sameKeyCandidates.error);

  const fetchedAt = now();
  const { data, error } = await supabaseAdmin
    .from("song_candidates")
    .insert({
      status: video ? "parsed" : "needs_video",
      source: "manual",
      youtube_video_id: video?.videoId ?? null,
      raw_title: video?.title ?? null,
      api_fetched_at: video ? fetchedAt : null,
      embeddable: video ? true : null,
      video_kind: "unknown",
      title: input.title,
      artist: input.artist,
      parse_method: "manual",
      dedupe_key: key,
      admin_memo: input.memo,
      possible_duplicate_song_id: possibleDuplicateSongId,
    })
    .select("id")
    .single();
  if (error) {
    if (error.code === UNIQUE_VIOLATION && video) {
      return { ok: false, message: "이미 후보에 있는 영상이에요.", candidateId: await findCandidateIdByVideo(video.videoId) };
    }
    return failure("수동 후보 추가", error);
  }
  return {
    ok: true,
    candidateId: data.id as string,
    hasPossibleDuplicate: possibleDuplicateSongId !== null,
    sameKeyCandidates,
  };
}

export async function attachVideoRow(
  id: string,
  video: YoutubeVideo,
): Promise<StoreResult<{ sameKeyCandidates: number }>> {
  const { data: row, error: readError } = await supabaseAdmin
    .from("song_candidates")
    .select("title, artist, dedupe_key")
    .eq("id", id)
    .eq("status", "needs_video")
    .maybeSingle();
  if (readError) return failure("영상 붙이기 전 조회", readError);
  if (!row) return { ok: false, message: STALE_MESSAGE };

  const sameKeyCandidates = await countSameKeyCandidates(row.dedupe_key as string | null);
  if (typeof sameKeyCandidates !== "number") return failure("같은 곡 후보 조회", sameKeyCandidates.error);

  const named = Boolean(row.title?.trim()) && Boolean(row.artist?.trim());
  const { data, error } = await supabaseAdmin
    .from("song_candidates")
    .update({
      status: named ? "parsed" : "new",
      youtube_video_id: video.videoId,
      raw_title: video.title,
      api_fetched_at: now(),
      embeddable: true,
      updated_at: now(),
    })
    .eq("id", id)
    .eq("status", "needs_video")
    .select("id");
  if (error) {
    if (error.code === UNIQUE_VIOLATION) {
      return { ok: false, message: "이미 후보에 있는 영상이에요.", candidateId: await findCandidateIdByVideo(video.videoId) };
    }
    return failure("영상 붙이기", error);
  }
  if (data.length === 0) return { ok: false, message: STALE_MESSAGE };
  return { ok: true, sameKeyCandidates };
}
