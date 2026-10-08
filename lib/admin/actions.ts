"use server";

import { revalidatePath, updateTag } from "next/cache";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import {
  parseAddChannelInput,
  parseAttachInput,
  parseManualInput,
  parseDistinctInput,
  parseId,
  parseLinkInput,
  parsePromoteAlternateInput,
  parseRejectInput,
  parseSaveInput,
  parseUpdateChannelInput,
  TAG_GROUPS,
} from "@/lib/admin/candidateInput";
import {
  attachVideoRow,
  checkVideoUnused,
  clearPossibleDuplicate,
  insertChannel,
  insertManualCandidate,
  linkVideoToSong as linkVideoToSongRow,
  promoteAlternateVideoRow,
  promoteCandidate,
  rejectCandidateRow,
  restoreCandidateRow,
  saveCandidateRow,
  updateChannelRow,
} from "@/lib/admin/candidateStore";
import { getTagCatalog } from "@/lib/admin/getAdminData";
import { checkVideoUrl } from "@/lib/admin/videoCheck";
import { parseChannelInput, parseVideoInput } from "@/lib/admin/parseYoutubeInput";
import type { AdminActionResult, CandidateTags } from "@/lib/admin/types";
import type { YoutubeVideo } from "@/lib/ingest/types";
import {
  createYoutubeSource,
  YoutubeApiError,
  YoutubeQuotaExceededError,
} from "@/lib/ingest/youtubeSource";

const INVALID_TAGS: AdminActionResult = { ok: false, message: "목록에 없는 태그가 들어 있어요." };
const GENERIC_FAILURE = "처리하지 못했어요. 잠시 후 다시 시도해 주세요.";

// 클라이언트 라우터 캐시(staleTimes.dynamic)에 남은 목록·상세를 비운다
function refreshAdminPages() {
  revalidatePath("/admin", "layout");
}

async function hasOnlyKnownTags(tags: CandidateTags): Promise<boolean> {
  const catalog = await getTagCatalog();
  return TAG_GROUPS.every((group) => tags[group].every((name) => catalog[group].includes(name)));
}

export async function saveCandidate(raw: unknown): Promise<AdminActionResult> {
  await requireAdmin();
  const parsed = parseSaveInput(raw);
  if (!parsed.ok) return parsed;
  if (!(await hasOnlyKnownTags(parsed.value.tags))) return INVALID_TAGS;

  const result = await saveCandidateRow(parsed.value);
  if (!result.ok) return result;
  refreshAdminPages();
  return { ok: true, message: "저장했어요." };
}

export async function approveCandidate(raw: unknown): Promise<AdminActionResult> {
  const user = await requireAdmin();
  const parsed = parseSaveInput(raw);
  if (!parsed.ok) return parsed;
  if (!(await hasOnlyKnownTags(parsed.value.tags))) return INVALID_TAGS;

  const saved = await saveCandidateRow(parsed.value);
  if (!saved.ok) return saved;
  refreshAdminPages();
  if (saved.status !== "tagged") {
    return { ok: false, message: "주제와 분위기 태그를 1개 이상 골라 주세요. (입력한 내용은 저장했어요)" };
  }

  const promoted = await promoteCandidate(parsed.value.id, user.id);
  if (!promoted.ok) return promoted;
  updateTag("catalog");
  refreshAdminPages();
  return { ok: true, message: "승인했어요." };
}

export async function rejectCandidate(raw: unknown): Promise<AdminActionResult> {
  const user = await requireAdmin();
  const parsed = parseRejectInput(raw);
  if (!parsed.ok) return parsed;

  const result = await rejectCandidateRow(parsed.value, user.id);
  if (!result.ok) return result;
  refreshAdminPages();
  return { ok: true, message: "거절했어요." };
}

export async function restoreCandidate(raw: unknown): Promise<AdminActionResult> {
  await requireAdmin();
  const id = parseId(raw);
  if (!id) return { ok: false, message: "요청 형식이 올바르지 않아요." };

  const result = await restoreCandidateRow(id);
  if (!result.ok) return result;
  refreshAdminPages();
  return { ok: true, message: "복원했어요." };
}

export async function confirmDistinctSong(raw: unknown): Promise<AdminActionResult> {
  await requireAdmin();
  const parsed = parseDistinctInput(raw);
  if (!parsed.ok) return parsed;

  const result = await clearPossibleDuplicate(parsed.value.candidateId, parsed.value.songId);
  if (!result.ok) return result;
  refreshAdminPages();
  return { ok: true, message: "별개 곡으로 확정했어요." };
}

export async function linkVideoToSong(raw: unknown): Promise<AdminActionResult> {
  const user = await requireAdmin();
  const parsed = parseLinkInput(raw);
  if (!parsed.ok) return parsed;

  const { candidateId, songId, replace } = parsed.value;
  const result = await linkVideoToSongRow(candidateId, songId, replace, user.id);
  if (!result.ok) return result;
  updateTag("catalog");
  refreshAdminPages();
  return { ok: true, message: "곡에 영상을 연결했어요." };
}

export async function promoteAlternateVideo(raw: unknown): Promise<AdminActionResult> {
  await requireAdmin();
  const parsed = parsePromoteAlternateInput(raw);
  if (!parsed.ok) return parsed;

  const result = await promoteAlternateVideoRow(parsed.value.currentId, parsed.value.alternateId);
  if (!result.ok) return result;
  refreshAdminPages();
  return { ok: true, message: "대표 영상을 바꿨어요." };
}

export async function addChannel(raw: unknown): Promise<AdminActionResult> {
  await requireAdmin();
  const parsed = parseAddChannelInput(raw);
  if (!parsed.ok) return parsed;

  const ref = parseChannelInput(parsed.value.input);
  if (!ref) {
    return { ok: false, message: "채널 주소, @핸들, UC로 시작하는 채널 ID 중 하나를 입력해 주세요." };
  }

  let channel;
  try {
    channel = await createYoutubeSource().resolveChannel(ref.value);
  } catch (error) {
    if (error instanceof YoutubeApiError && error.status === 404) {
      return { ok: false, message: "채널을 찾을 수 없어요." };
    }
    if (error instanceof YoutubeQuotaExceededError) {
      return { ok: false, message: "YouTube API 쿼터를 다 썼어요. 내일 다시 시도해 주세요." };
    }
    console.error("[admin] 채널 조회 실패:", error instanceof Error ? error.name : "unknown");
    return { ok: false, message: GENERIC_FAILURE };
  }

  const result = await insertChannel(parsed.value, {
    youtubeChannelId: channel.channelId,
    name: channel.name,
    uploadsPlaylistId: channel.uploadsPlaylistId,
  });
  if (!result.ok) return result;
  refreshAdminPages();
  return { ok: true, message: `"${channel.name}" 채널을 추가했어요.` };
}

export async function updateChannel(raw: unknown): Promise<AdminActionResult> {
  await requireAdmin();
  const parsed = parseUpdateChannelInput(raw);
  if (!parsed.ok) return parsed;

  const result = await updateChannelRow(parsed.value);
  if (!result.ok) return result;
  refreshAdminPages();
  return { ok: true, message: "저장했어요." };
}

export async function createManualCandidate(raw: unknown): Promise<AdminActionResult> {
  await requireAdmin();
  const parsed = parseManualInput(raw);
  if (!parsed.ok) return parsed;

  const warnings: string[] = [];
  let video: YoutubeVideo | null = null;
  if (parsed.value.url) {
    const videoId = parseVideoInput(parsed.value.url);
    if (!videoId) return { ok: false, message: "유튜브 영상 주소를 확인해 주세요." };
    const conflict = await checkVideoUnused(videoId);
    if (conflict) return conflict;
    const checked = await checkVideoUrl(parsed.value.url);
    if (!checked.ok) return checked;
    video = checked.video;
    warnings.push(...checked.warnings);
  }

  const result = await insertManualCandidate(parsed.value, video);
  if (!result.ok) return result;
  if (result.hasPossibleDuplicate) warnings.push("기존 곡과 비슷해요. 후보에서 확인해 주세요");
  if (result.sameKeyCandidates > 0) warnings.push("같은 곡의 다른 후보가 이미 있어요");
  refreshAdminPages();

  const base = video ? "후보를 추가했어요 (태그 필요)." : "후보를 추가했어요 (영상 필요).";
  return {
    ok: true,
    candidateId: result.candidateId,
    message: warnings.length > 0 ? `${base} 주의: ${warnings.join(", ")}.` : base,
  };
}

export async function attachVideo(raw: unknown): Promise<AdminActionResult> {
  await requireAdmin();
  const parsed = parseAttachInput(raw);
  if (!parsed.ok) return parsed;

  const videoId = parseVideoInput(parsed.value.url);
  if (!videoId) return { ok: false, message: "유튜브 영상 주소를 확인해 주세요." };
  const conflict = await checkVideoUnused(videoId, parsed.value.id);
  if (conflict) return conflict;

  const checked = await checkVideoUrl(parsed.value.url);
  if (!checked.ok) return checked;

  const result = await attachVideoRow(parsed.value.id, checked.video);
  if (!result.ok) return result;
  refreshAdminPages();
  const warnings = [...checked.warnings];
  if (result.sameKeyCandidates > 0) warnings.push("같은 곡 후보가 이미 있어요");
  const suffix = warnings.length > 0 ? ` 주의: ${warnings.join(", ")}.` : "";
  return { ok: true, message: `영상을 붙였어요.${suffix}` };
}
