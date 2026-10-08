import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { filterVideo } from "./filterVideo";
import {
  artistKeys,
  buildSongIndex,
  dedupeKey,
  hasHangul,
  matchExistingSong,
  type SongIndex,
} from "./normalizeSong";
import { parseVideoTitle } from "./parseVideoTitle";
import type {
  ExistingSong,
  IngestChannelKind,
  ParsedSong,
  VideoKind,
  YoutubeVideo,
} from "./types";
import {
  YoutubeQuotaExceededError,
  YoutubeUnavailableError,
  type YoutubeSource,
} from "./youtubeSource";

const OVERLAP_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_FAIL_COUNT = 5;
const SONG_PAGE_SIZE = 1000;
// 한글 키는 URL 인코딩되면 길어져서 호스팅 게이트웨이 URL 길이 제한을 넘기지 않도록 나눠 조회한다
const KEY_QUERY_CHUNK = 20;
const LAST_ERROR_MAX_LENGTH = 500;
// 같은 곡의 "대표" 후보로 취급하는 상태 — rejected/unavailable/duplicate 행은 대표가 아니다
const REPRESENTATIVE_STATUSES = ["new", "parsed", "tagged", "approved"];

type ChannelRow = {
  id: string;
  youtube_channel_id: string;
  uploads_playlist_id: string;
  name: string;
  kind: IngestChannelKind;
  default_artist: string | null;
  last_seen_published_at: string | null;
  backfill_page_token: string | null;
  fail_count: number;
};

type CandidateRow = {
  status: "new" | "parsed" | "rejected" | "duplicate";
  source: "youtube";
  youtube_video_id: string;
  channel_id: string;
  raw_title: string | null;
  api_fetched_at: string;
  published_at: string | null;
  embeddable: boolean;
  video_kind: VideoKind;
  title: string | null;
  artist: string | null;
  parse_method: "rule" | null;
  dedupe_key: string | null;
  possible_duplicate_song_id: string | null;
  song_id: string | null;
  reject_reason: string | null;
};

export type IngestStopReason = "completed" | "deadline" | "quota_exceeded" | "youtube_unavailable";

export type IngestSummary = {
  stoppedReason: IngestStopReason;
  channelsTotal: number;
  channelsCompleted: number;
  channelsFailed: number;
  pagesRead: number;
  videosFetched: number;
  filteredOut: Record<string, number>;
  newCandidates: number;
  newByStatus: Record<string, number>;
  units: number;
  errors: { channel: string; message: string }[];
};

export type RunChannelIngestOptions = {
  db: SupabaseClient;
  youtube: YoutubeSource;
  deadline: number;
};

type Context = RunChannelIngestOptions & {
  songIndex: SongIndex;
  knownArtistKeys: Set<string>;
  claimedKeys: Set<string>;
  summary: IngestSummary;
};

function bump(record: Record<string, number>, key: string) {
  record[key] = (record[key] ?? 0) + 1;
}

function fail(context: string, error: { message: string }): never {
  throw new Error(`${context}: ${error.message}`);
}

async function loadSongs(db: SupabaseClient): Promise<ExistingSong[]> {
  const songs: ExistingSong[] = [];
  for (let from = 0; ; from += SONG_PAGE_SIZE) {
    const { data, error } = await db
      .from("songs")
      .select("id, title, artist")
      .order("id")
      .range(from, from + SONG_PAGE_SIZE - 1);
    if (error) fail("songs 조회 실패", error);
    songs.push(...(data as ExistingSong[]));
    if (data.length < SONG_PAGE_SIZE) return songs;
  }
}

async function findKnownVideoIds(db: SupabaseClient, ids: string[]): Promise<Set<string>> {
  if (ids.length === 0) return new Set();
  const [candidates, songs] = await Promise.all([
    db.from("song_candidates").select("youtube_video_id").in("youtube_video_id", ids),
    db.from("songs").select("youtube_video_id").in("youtube_video_id", ids),
  ]);
  if (candidates.error) fail("song_candidates 조회 실패", candidates.error);
  if (songs.error) fail("songs 영상 조회 실패", songs.error);
  return new Set(
    [...candidates.data, ...songs.data].map((row) => row.youtube_video_id as string),
  );
}

async function findClaimedKeys(db: SupabaseClient, keys: string[]): Promise<Set<string>> {
  const found = new Set<string>();
  for (let i = 0; i < keys.length; i += KEY_QUERY_CHUNK) {
    const { data, error } = await db
      .from("song_candidates")
      .select("dedupe_key")
      .in("dedupe_key", keys.slice(i, i + KEY_QUERY_CHUNK))
      .in("status", REPRESENTATIVE_STATUSES);
    if (error) fail("dedupe_key 조회 실패", error);
    for (const row of data) found.add(row.dedupe_key as string);
  }
  return found;
}

function buildRow(
  context: Context,
  channel: ChannelRow,
  video: YoutubeVideo,
  parsed: ParsedSong,
  publishedAt: string | null,
  fetchedAt: string,
): CandidateRow {
  const base = {
    source: "youtube" as const,
    youtube_video_id: video.videoId,
    channel_id: channel.id,
    api_fetched_at: fetchedAt,
    published_at: publishedAt,
    embeddable: video.embeddable,
  };
  const parsedFields = {
    video_kind: parsed.videoKind,
    title: parsed.title || null,
    artist: parsed.artist,
  };
  const noDedupe = { dedupe_key: null, possible_duplicate_song_id: null, song_id: null };

  const rejection = parsed.isMedley
    ? "medley"
    : parsed.title && !hasHangul(parsed.title)
      ? "no_hangul"
      : null;
  if (rejection) {
    // 거절 행은 API 원본 제목을 남기지 않는다
    return {
      ...base,
      ...parsedFields,
      ...noDedupe,
      status: "rejected",
      raw_title: null,
      parse_method: "rule",
      reject_reason: rejection,
    };
  }

  if (!parsed.confident || !parsed.title || !parsed.artist) {
    return {
      ...base,
      video_kind: parsed.videoKind,
      title: null,
      artist: null,
      ...noDedupe,
      status: "new",
      raw_title: video.title,
      parse_method: null,
      reject_reason: null,
    };
  }

  const key = dedupeKey(parsed.title, parsed.artist);
  const match = matchExistingSong(context.songIndex, parsed.title, parsed.artist);
  const matchedSong = match.kind === "duplicate" ? match.songId : null;
  const possibleSong = match.kind === "possibleDuplicate" ? match.songId : null;
  const duplicatesCandidate = key !== null && context.claimedKeys.has(key);
  const isDuplicate = matchedSong !== null || duplicatesCandidate;

  if (key !== null && !isDuplicate) context.claimedKeys.add(key);

  return {
    ...base,
    ...parsedFields,
    status: isDuplicate ? "duplicate" : "parsed",
    raw_title: video.title,
    parse_method: "rule",
    dedupe_key: key,
    possible_duplicate_song_id: possibleSong,
    song_id: matchedSong,
    reject_reason: null,
  };
}

async function ingestPage(
  context: Context,
  channel: ChannelRow,
  items: { videoId: string; publishedAt: string | null }[],
): Promise<"done" | "deadline"> {
  const { db, youtube, summary } = context;
  const known = await findKnownVideoIds(db, items.map((item) => item.videoId));
  const fresh = items.filter((item) => !known.has(item.videoId));
  if (fresh.length === 0) return "done";

  if (Date.now() >= context.deadline) return "deadline";

  const videos = new Map(
    (await youtube.getVideos(fresh.map((item) => item.videoId))).map((v) => [v.videoId, v]),
  );
  summary.videosFetched += videos.size;

  const channelInfo = {
    kind: channel.kind,
    name: channel.name,
    defaultArtist: channel.default_artist,
  };
  const passed: {
    video: YoutubeVideo;
    parsed: ParsedSong;
    publishedAt: string | null;
  }[] = [];
  for (const item of fresh) {
    const video = videos.get(item.videoId);
    if (!video) continue;
    const result = filterVideo(video);
    if (!result.pass) {
      bump(summary.filteredOut, result.reason);
      continue;
    }
    const parsed = parseVideoTitle(video.title, channelInfo, context.knownArtistKeys);
    passed.push({ video, parsed, publishedAt: item.publishedAt });
  }
  if (passed.length === 0) return "done";

  // 대표 후보 여부는 INSERT 전에 한 번에 조회해야 해서 키를 먼저 모은다
  const keys = new Set<string>();
  for (const { parsed } of passed) {
    if (parsed.confident && parsed.title && parsed.artist && !parsed.isMedley) {
      const key = dedupeKey(parsed.title, parsed.artist);
      if (key) keys.add(key);
    }
  }
  for (const key of await findClaimedKeys(db, [...keys])) context.claimedKeys.add(key);

  const fetchedAt = new Date().toISOString();
  const rows = passed.map(({ video, parsed, publishedAt }) =>
    buildRow(context, channel, video, parsed, publishedAt, fetchedAt),
  );

  const { data, error } = await db
    .from("song_candidates")
    .upsert(rows, { onConflict: "youtube_video_id", ignoreDuplicates: true })
    .select("status");
  if (error) fail("song_candidates 저장 실패", error);
  for (const row of data) {
    summary.newCandidates += 1;
    bump(summary.newByStatus, row.status as string);
  }
  return "done";
}

async function updateChannel(
  db: SupabaseClient,
  channelId: string,
  fields: Record<string, unknown>,
  expectedToken?: { value: string | null },
): Promise<boolean> {
  let query = db.from("ingest_channels").update(fields).eq("id", channelId);
  if (expectedToken) {
    query =
      expectedToken.value === null
        ? query.is("backfill_page_token", null)
        : query.eq("backfill_page_token", expectedToken.value);
  }
  const { data, error } = await query.select("id");
  if (error) fail("ingest_channels 갱신 실패", error);
  return data.length > 0;
}

async function ingestChannel(
  context: Context,
  channel: ChannelRow,
): Promise<"completed" | "deadline" | "superseded"> {
  const { db, youtube, summary } = context;
  const isBackfill = channel.backfill_page_token !== null || channel.last_seen_published_at === null;
  const cutoff =
    !isBackfill && channel.last_seen_published_at
      ? Date.parse(channel.last_seen_published_at) - OVERLAP_MS
      : null;

  let pageToken = channel.backfill_page_token;
  let newest = channel.last_seen_published_at;

  for (;;) {
    if (Date.now() >= context.deadline) return "deadline";

    const page = await youtube.listUploads(channel.uploads_playlist_id, pageToken);
    summary.pagesRead += 1;

    // 예약 프리미어 등 미래 시각이 커서를 앞질러 신규 영상을 건너뛰지 않게 현재 시각으로 막는다
    const now = Date.now();
    for (const item of page.items) {
      if (!item.publishedAt) continue;
      const published = Math.min(Date.parse(item.publishedAt), now);
      if (!newest || published > Date.parse(newest)) newest = new Date(published).toISOString();
    }

    let items = page.items;
    let reachedCutoff = false;
    if (cutoff !== null) {
      items = items.filter(
        (item) => item.publishedAt === null || Date.parse(item.publishedAt) >= cutoff,
      );
      reachedCutoff = items.length === 0;
    }

    if ((await ingestPage(context, channel, items)) === "deadline") return "deadline";

    const finished = reachedCutoff || page.nextPageToken === null;
    const checkedAt = new Date().toISOString();
    const expected = isBackfill ? { value: pageToken } : undefined;
    if (finished) {
      const ok = await updateChannel(
        db,
        channel.id,
        {
          last_seen_published_at: newest,
          backfill_page_token: null,
          last_checked_at: checkedAt,
          fail_count: 0,
          last_error: null,
        },
        expected,
      );
      return ok ? "completed" : "superseded";
    }

    pageToken = page.nextPageToken;
    if (isBackfill) {
      const ok = await updateChannel(
        db,
        channel.id,
        {
          last_seen_published_at: newest,
          backfill_page_token: pageToken,
          last_checked_at: checkedAt,
        },
        expected,
      );
      if (!ok) return "superseded";
    }
  }
}

export async function runChannelIngest(options: RunChannelIngestOptions): Promise<IngestSummary> {
  const { db } = options;
  const summary: IngestSummary = {
    stoppedReason: "completed",
    channelsTotal: 0,
    channelsCompleted: 0,
    channelsFailed: 0,
    pagesRead: 0,
    videosFetched: 0,
    filteredOut: {},
    newCandidates: 0,
    newByStatus: {},
    units: 0,
    errors: [],
  };

  const { data: channels, error } = await db
    .from("ingest_channels")
    .select(
      "id, youtube_channel_id, uploads_playlist_id, name, kind, default_artist, last_seen_published_at, backfill_page_token, fail_count",
    )
    .eq("status", "tracking")
    .lt("fail_count", MAX_FAIL_COUNT)
    .order("last_checked_at", { ascending: true, nullsFirst: true });
  if (error) fail("ingest_channels 조회 실패", error);
  const targets = channels as ChannelRow[];
  summary.channelsTotal = targets.length;

  const songs = await loadSongs(db);
  const knownArtistKeys = new Set<string>();
  for (const song of songs) for (const key of artistKeys(song.artist)) knownArtistKeys.add(key);
  for (const channel of targets) {
    if (channel.default_artist) {
      for (const key of artistKeys(channel.default_artist)) knownArtistKeys.add(key);
    }
  }

  const context: Context = {
    ...options,
    songIndex: buildSongIndex(songs),
    knownArtistKeys,
    claimedKeys: new Set(),
    summary,
  };

  for (const channel of targets) {
    if (Date.now() >= options.deadline) {
      summary.stoppedReason = "deadline";
      break;
    }
    try {
      const outcome = await ingestChannel(context, channel);
      if (outcome === "deadline") {
        summary.stoppedReason = "deadline";
        break;
      }
      if (outcome === "completed") summary.channelsCompleted += 1;
    } catch (caught) {
      if (caught instanceof YoutubeQuotaExceededError) {
        summary.stoppedReason = "quota_exceeded";
        break;
      }
      if (caught instanceof YoutubeUnavailableError) {
        summary.stoppedReason = "youtube_unavailable";
        summary.errors.push({ channel: channel.name, message: caught.message });
        break;
      }
      const message = (caught instanceof Error ? caught.message : String(caught)).slice(
        0,
        LAST_ERROR_MAX_LENGTH,
      );
      summary.channelsFailed += 1;
      summary.errors.push({ channel: channel.name, message });
      await updateChannel(db, channel.id, {
        fail_count: channel.fail_count + 1,
        last_error: message,
        last_checked_at: new Date().toISOString(),
      }).catch(() => {}); // 실패 기록이 실패해도 다음 채널 처리는 계속한다
    }
  }

  summary.units = options.youtube.units();
  return summary;
}
