import "server-only";
import type { YoutubeVideo } from "./types";

const API_BASE = "https://www.googleapis.com/youtube/v3";
const REQUEST_TIMEOUT_MS = 15_000;
const MAX_VIDEO_IDS = 50;
const PLAYLIST_PAGE_SIZE = 50;
const QUOTA_REASONS = new Set(["quotaExceeded", "dailyLimitExceeded"]);
// 키·권한·속도 제한 문제는 채널이 아니라 실행 전체의 문제다
const UNAVAILABLE_REASONS = new Set([
  "keyInvalid",
  "API_KEY_INVALID",
  "accessNotConfigured",
  "ipRefererBlocked",
  "forbidden",
  "rateLimitExceeded",
  "userRateLimitExceeded",
]);

export class YoutubeQuotaExceededError extends Error {
  constructor(message = "YouTube API 쿼터 초과") {
    super(message);
    this.name = "YoutubeQuotaExceededError";
  }
}

export class YoutubeUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "YoutubeUnavailableError";
  }
}

export class YoutubeApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "YoutubeApiError";
  }
}

export type YoutubeChannelInfo = {
  channelId: string;
  name: string;
  uploadsPlaylistId: string;
};

export type UploadItem = {
  videoId: string;
  publishedAt: string | null;
};

export type UploadsPage = {
  items: UploadItem[];
  nextPageToken: string | null;
};

export type YoutubeSource = {
  units(): number;
  resolveChannel(idOrHandle: string): Promise<YoutubeChannelInfo>;
  listUploads(playlistId: string, pageToken?: string | null): Promise<UploadsPage>;
  getVideos(videoIds: readonly string[]): Promise<YoutubeVideo[]>;
};

type ApiErrorBody = {
  error?: {
    message?: string;
    errors?: { reason?: string }[];
    details?: { reason?: string }[];
  };
};

type RawVideo = {
  id: string;
  snippet?: { title?: string; channelTitle?: string; liveBroadcastContent?: string };
  contentDetails?: {
    duration?: string;
    regionRestriction?: { allowed?: string[]; blocked?: string[] };
  };
  status?: { embeddable?: boolean; privacyStatus?: string };
};

function toVideo(raw: RawVideo): YoutubeVideo {
  const live = raw.snippet?.liveBroadcastContent;
  const privacy = raw.status?.privacyStatus;
  const region = raw.contentDetails?.regionRestriction;
  return {
    videoId: raw.id,
    title: raw.snippet?.title ?? "",
    channelTitle: raw.snippet?.channelTitle ?? "",
    duration: raw.contentDetails?.duration ?? "",
    liveBroadcastContent: live === "live" || live === "upcoming" ? live : "none",
    embeddable: raw.status?.embeddable === true,
    privacyStatus: privacy === "private" || privacy === "unlisted" ? privacy : "public",
    regionRestriction: region ? { allowed: region.allowed, blocked: region.blocked } : null,
  };
}

export function createYoutubeSource(apiKey = process.env.YOUTUBE_API_KEY): YoutubeSource {
  if (!apiKey) throw new Error("YOUTUBE_API_KEY가 설정되지 않았습니다.");
  let units = 0;

  async function call<T>(endpoint: string, params: Record<string, string>): Promise<T> {
    const url = new URL(`${API_BASE}/${endpoint}`);
    for (const [name, value] of Object.entries(params)) url.searchParams.set(name, value);

    const response = await fetch(url, {
      cache: "no-store",
      headers: { "X-Goog-Api-Key": apiKey! },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    units += 1;

    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as ApiErrorBody;
      const reasons = [
        ...(body.error?.errors ?? []),
        ...(body.error?.details ?? []),
      ].flatMap((e) => (e.reason ? [e.reason] : []));
      const message = `YouTube ${endpoint} ${response.status}: ${body.error?.message ?? "요청 실패"}`;
      if (response.status === 403 && reasons.some((r) => QUOTA_REASONS.has(r))) {
        throw new YoutubeQuotaExceededError();
      }
      // 잘못된 키는 reason이 badRequest로만 오는 경우가 있어 메시지로도 판별한다
      const invalidKey = response.status === 400 && /API key/i.test(body.error?.message ?? "");
      if (response.status === 429 || invalidKey || reasons.some((r) => UNAVAILABLE_REASONS.has(r))) {
        throw new YoutubeUnavailableError(message);
      }
      throw new YoutubeApiError(message, response.status);
    }
    return (await response.json()) as T;
  }

  return {
    units: () => units,

    async resolveChannel(idOrHandle) {
      const lookup: Record<string, string> = idOrHandle.startsWith("@")
        ? { forHandle: idOrHandle }
        : { id: idOrHandle };
      const data = await call<{
        items?: {
          id: string;
          snippet?: { title?: string };
          contentDetails?: { relatedPlaylists?: { uploads?: string } };
        }[];
      }>("channels", { part: "snippet,contentDetails", ...lookup });

      const channel = data.items?.[0];
      const uploads = channel?.contentDetails?.relatedPlaylists?.uploads;
      if (!channel || !uploads) throw new YoutubeApiError("채널을 찾을 수 없습니다.", 404);
      return {
        channelId: channel.id,
        name: channel.snippet?.title ?? "",
        uploadsPlaylistId: uploads,
      };
    },

    async listUploads(playlistId, pageToken) {
      const data = await call<{
        items?: {
          contentDetails?: { videoId?: string; videoPublishedAt?: string };
        }[];
        nextPageToken?: string;
      }>("playlistItems", {
        part: "contentDetails",
        playlistId,
        maxResults: String(PLAYLIST_PAGE_SIZE),
        ...(pageToken ? { pageToken } : {}),
      });

      const items: UploadItem[] = [];
      for (const item of data.items ?? []) {
        const videoId = item.contentDetails?.videoId;
        if (videoId) {
          items.push({ videoId, publishedAt: item.contentDetails?.videoPublishedAt ?? null });
        }
      }
      return { items, nextPageToken: data.nextPageToken ?? null };
    },

    async getVideos(videoIds) {
      if (videoIds.length === 0) return [];
      if (videoIds.length > MAX_VIDEO_IDS) {
        throw new Error(`videos.list는 한 번에 ${MAX_VIDEO_IDS}개까지만 조회할 수 있습니다.`);
      }
      const data = await call<{ items?: RawVideo[] }>("videos", {
        part: "snippet,contentDetails,status",
        id: videoIds.join(","),
      });
      return (data.items ?? []).map(toVideo);
    },
  };
}
