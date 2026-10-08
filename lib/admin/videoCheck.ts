import "server-only";
import { blocksKorea, filterVideo } from "@/lib/ingest/filterVideo";
import type { FilterReason, YoutubeVideo } from "@/lib/ingest/types";
import {
  createYoutubeSource,
  YoutubeQuotaExceededError,
  YoutubeUnavailableError,
} from "@/lib/ingest/youtubeSource";
import { parseVideoInput } from "./parseYoutubeInput";

const WARNING_LABELS: Partial<Record<FilterReason, string>> = {
  short: "1분 이하의 짧은 영상이에요",
  too_long: "15분이 넘는 긴 영상이에요",
  live_broadcast: "라이브 방송 영상이에요",
  keyword: "제목에 곡이 아닐 수 있는 단어가 있어요",
  invalid_duration: "영상 길이를 확인하지 못했어요",
};

export type VideoCheck =
  | { ok: true; video: YoutubeVideo; warnings: string[] }
  | { ok: false; message: string };

export async function checkVideoUrl(url: string): Promise<VideoCheck> {
  const videoId = parseVideoInput(url);
  if (!videoId) return { ok: false, message: "유튜브 영상 주소를 확인해 주세요." };

  let video: YoutubeVideo | undefined;
  try {
    [video] = await createYoutubeSource().getVideos([videoId]);
  } catch (error) {
    if (error instanceof YoutubeQuotaExceededError) {
      return { ok: false, message: "YouTube API 쿼터를 다 썼어요. 내일 다시 시도해 주세요." };
    }
    console.error("[admin] 영상 조회 실패:", error instanceof YoutubeUnavailableError ? "unavailable" : "unknown");
    return { ok: false, message: "영상을 확인하지 못했어요. 잠시 후 다시 시도해 주세요." };
  }

  if (!video) return { ok: false, message: "영상을 찾을 수 없어요. 비공개이거나 삭제된 영상일 수 있어요." };
  if (!video.embeddable) return { ok: false, message: "퍼가기가 허용되지 않은 영상이에요." };
  if (video.privacyStatus !== "public") return { ok: false, message: "공개 영상이 아니에요." };
  if (blocksKorea(video.regionRestriction)) return { ok: false, message: "한국에서 볼 수 없는 영상이에요." };

  const filtered = filterVideo(video);
  const warning = !filtered.pass ? WARNING_LABELS[filtered.reason] : undefined;
  return { ok: true, video, warnings: warning ? [warning] : [] };
}
