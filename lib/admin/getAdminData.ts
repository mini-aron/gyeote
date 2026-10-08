import "server-only";
import { supabaseAdmin } from "@/shared/lib/supabase-client";
import { getTagOptions, getTaggedSongs } from "@/lib/catalog/catalogCache";
import { readSuggestedTags } from "./candidateInput";
import { ADMIN_TABS, LIST_PAGE_SIZE, type AdminTabKey } from "./tabs";
import type {
  CandidateDetail,
  CandidateListItem,
  CandidateStatus,
  ChannelListItem,
  LinkedSong,
  SiblingCandidate,
  TagCatalog,
} from "./types";

const KEY_QUERY_CHUNK = 20;
const SIBLING_LIMIT = 30;

const TAB_FILTERS: Record<AdminTabKey, { status: CandidateStatus; linkOnly?: true }> = {
  ready: { status: "tagged" },
  tagging: { status: "parsed" },
  parsing: { status: "new" },
  video: { status: "needs_video" },
  link: { status: "duplicate", linkOnly: true },
  rejected: { status: "rejected" },
};

function fail(context: string, error: { message: string }): never {
  throw new Error(`${context}: ${error.message}`);
}

export async function getTabCounts(): Promise<Record<AdminTabKey, number>> {
  const results = await Promise.all(
    ADMIN_TABS.map(({ key }) => {
      const filter = TAB_FILTERS[key];
      let query = supabaseAdmin
        .from("song_candidates")
        .select("id", { count: "exact", head: true })
        .eq("status", filter.status);
      if (filter.linkOnly) query = query.not("song_id", "is", null).is("reviewed_at", null);
      return query;
    }),
  );
  const counts = {} as Record<AdminTabKey, number>;
  ADMIN_TABS.forEach(({ key }, index) => {
    const { count, error } = results[index];
    if (error) fail("후보 건수 조회 실패", error);
    counts[key] = count ?? 0;
  });
  return counts;
}

export async function getRecommendableSongCount(): Promise<number> {
  return (await getTaggedSongs()).length;
}

export async function getTagCatalog(): Promise<TagCatalog> {
  const [themes, situations, moods] = await Promise.all([
    getTagOptions("themes"),
    getTagOptions("situations"),
    getTagOptions("moods"),
  ]);
  const names = (options: { name: string }[]) => options.map((option) => option.name);
  return { themes: names(themes), situations: names(situations), moods: names(moods) };
}

type ListRow = {
  id: string;
  status: CandidateStatus;
  title: string | null;
  artist: string | null;
  raw_title: string | null;
  video_kind: string | null;
  ai_attempts: number;
  possible_duplicate_song_id: string | null;
  dedupe_key: string | null;
  reject_reason: string | null;
  created_at: string;
  ingest_channels: { name: string } | null;
};

async function findRejectedKeys(keys: string[]): Promise<Set<string>> {
  const found = new Set<string>();
  const chunks: string[][] = [];
  for (let i = 0; i < keys.length; i += KEY_QUERY_CHUNK) chunks.push(keys.slice(i, i + KEY_QUERY_CHUNK));
  const results = await Promise.all(
    chunks.map((chunk) =>
      supabaseAdmin
        .from("song_candidates")
        .select("dedupe_key")
        .in("dedupe_key", chunk)
        .eq("status", "rejected"),
    ),
  );
  for (const { data, error } of results) {
    if (error) fail("거절 이력 조회 실패", error);
    for (const row of data) found.add(row.dedupe_key as string);
  }
  return found;
}

export async function getCandidateList(tab: AdminTabKey, page: number): Promise<CandidateListItem[]> {
  const from = (page - 1) * LIST_PAGE_SIZE;
  const filter = TAB_FILTERS[tab];
  let query = supabaseAdmin
    .from("song_candidates")
    .select(
      "id, status, title, artist, raw_title, video_kind, ai_attempts, possible_duplicate_song_id, dedupe_key, reject_reason, created_at, ingest_channels(name)",
    )
    .eq("status", filter.status);
  if (filter.linkOnly) query = query.not("song_id", "is", null).is("reviewed_at", null);
  const ordered =
    tab === "rejected"
      ? query.order("updated_at", { ascending: false }).order("id", { ascending: false })
      : query.order("created_at").order("id");
  const { data, error } = await ordered.range(from, from + LIST_PAGE_SIZE - 1);
  if (error) fail("후보 목록 조회 실패", error);

  const rows = data as unknown as ListRow[];
  const keys = [...new Set(rows.flatMap((row) => (row.dedupe_key && row.status !== "rejected" ? [row.dedupe_key] : [])))];
  const rejectedKeys = await findRejectedKeys(keys);

  return rows.map((row) => ({
    id: row.id,
    status: row.status,
    title: row.title,
    artist: row.artist,
    rawTitle: row.raw_title,
    videoKind: row.video_kind,
    channelName: row.ingest_channels?.name ?? null,
    aiAttempts: row.ai_attempts,
    hasPossibleDuplicate: row.possible_duplicate_song_id !== null,
    previouslyRejected: row.dedupe_key !== null && rejectedKeys.has(row.dedupe_key),
    rejectReason: row.reject_reason,
    createdAt: row.created_at,
  }));
}

type DetailRow = {
  id: string;
  status: CandidateStatus;
  source: "youtube" | "manual";
  youtube_video_id: string | null;
  raw_title: string | null;
  embeddable: boolean | null;
  video_kind: string | null;
  title: string | null;
  artist: string | null;
  dedupe_key: string | null;
  suggested_tags: unknown;
  admin_memo: string | null;
  possible_duplicate_song_id: string | null;
  song_id: string | null;
  ai_attempts: number;
  last_error: string | null;
  reject_reason: string | null;
  reviewed_at: string | null;
  created_at: string;
  ingest_channels: { name: string } | null;
};

type SongRow = {
  id: string;
  title: string;
  artist: string;
  youtube_video_id: string | null;
  is_active: boolean;
};

type SiblingRow = {
  id: string;
  status: CandidateStatus;
  video_kind: string | null;
  youtube_video_id: string | null;
  embeddable: boolean | null;
  song_id: string | null;
  ingest_channels: { name: string } | null;
};

function toLinkedSong(row: SongRow | undefined): LinkedSong | null {
  if (!row) return null;
  return {
    id: row.id,
    title: row.title,
    artist: row.artist,
    youtubeVideoId: row.youtube_video_id,
    isActive: row.is_active,
  };
}

function naturalTab(row: DetailRow): AdminTabKey | null {
  switch (row.status) {
    case "tagged":
      return "ready";
    case "parsed":
      return "tagging";
    case "new":
      return "parsing";
    case "needs_video":
      return "video";
    case "duplicate":
      return row.song_id && !row.reviewed_at ? "link" : null;
    case "rejected":
      return "rejected";
    default:
      return null;
  }
}

async function findNextId(tab: AdminTabKey, row: DetailRow): Promise<string | null> {
  if (tab === "rejected") return null;
  const filter = TAB_FILTERS[tab];
  let query = supabaseAdmin.from("song_candidates").select("id").eq("status", filter.status);
  if (filter.linkOnly) query = query.not("song_id", "is", null).is("reviewed_at", null);
  const { data, error } = await query
    .or(`created_at.gt.${row.created_at},and(created_at.eq.${row.created_at},id.gt.${row.id})`)
    .order("created_at")
    .order("id")
    .limit(1);
  if (error) fail("다음 후보 조회 실패", error);
  return (data[0]?.id as string | undefined) ?? null;
}

export type CandidateDetailResult = {
  detail: CandidateDetail;
  tab: AdminTabKey | null;
  nextId: string | null;
};

export async function getCandidateDetail(
  id: string,
  requestedTab: AdminTabKey | null,
): Promise<CandidateDetailResult | null> {
  const { data, error } = await supabaseAdmin
    .from("song_candidates")
    .select(
      "id, status, source, youtube_video_id, raw_title, embeddable, video_kind, title, artist, dedupe_key, suggested_tags, admin_memo, possible_duplicate_song_id, song_id, ai_attempts, last_error, reject_reason, reviewed_at, created_at, ingest_channels(name)",
    )
    .eq("id", id)
    .maybeSingle();
  if (error) fail("후보 조회 실패", error);
  if (!data) return null;
  const row = data as unknown as DetailRow;

  const tab = requestedTab ?? naturalTab(row);
  const songIds = [row.possible_duplicate_song_id, row.song_id].filter((value): value is string => value !== null);

  const [songs, siblings, rejected, nextId] = await Promise.all([
    songIds.length > 0
      ? supabaseAdmin.from("songs").select("id, title, artist, youtube_video_id, is_active").in("id", songIds)
      : null,
    row.dedupe_key
      ? supabaseAdmin
          .from("song_candidates")
          .select("id, status, video_kind, youtube_video_id, embeddable, song_id, ingest_channels(name)")
          .eq("dedupe_key", row.dedupe_key)
          .neq("id", row.id)
          .neq("status", "rejected")
          .order("created_at")
          .limit(SIBLING_LIMIT)
      : null,
    row.dedupe_key
      ? supabaseAdmin
          .from("song_candidates")
          .select("id", { count: "exact", head: true })
          .eq("dedupe_key", row.dedupe_key)
          .eq("status", "rejected")
          .neq("id", row.id)
      : null,
    tab ? findNextId(tab, row) : null,
  ]);
  if (songs?.error) fail("곡 조회 실패", songs.error);
  if (siblings?.error) fail("같은 곡 후보 조회 실패", siblings.error);
  if (rejected?.error) fail("거절 이력 조회 실패", rejected.error);

  const songRows = (songs?.data ?? []) as SongRow[];
  const byId = new Map(songRows.map((song) => [song.id, song]));
  const siblingItems: SiblingCandidate[] = ((siblings?.data ?? []) as unknown as SiblingRow[]).map((item) => ({
    id: item.id,
    status: item.status,
    videoKind: item.video_kind,
    youtubeVideoId: item.youtube_video_id,
    embeddable: item.embeddable,
    channelName: item.ingest_channels?.name ?? null,
    songId: item.song_id,
  }));

  return {
    tab,
    nextId,
    detail: {
      id: row.id,
      status: row.status,
      source: row.source,
      youtubeVideoId: row.youtube_video_id,
      channelName: row.ingest_channels?.name ?? null,
      rawTitle: row.raw_title,
      embeddable: row.embeddable,
      videoKind: row.video_kind,
      title: row.title,
      artist: row.artist,
      tags: readSuggestedTags(row.suggested_tags),
      adminMemo: row.admin_memo,
      aiAttempts: row.ai_attempts,
      lastError: row.last_error,
      rejectReason: row.reject_reason,
      reviewed: row.reviewed_at !== null,
      possibleDuplicate: toLinkedSong(row.possible_duplicate_song_id ? byId.get(row.possible_duplicate_song_id) : undefined),
      linkedSong: toLinkedSong(row.song_id ? byId.get(row.song_id) : undefined),
      siblings: siblingItems,
      previouslyRejected: (rejected?.count ?? 0) > 0,
    },
  };
}

function formatChecked(iso: string | null): string {
  if (!iso) return "아직 수집 전";
  return new Date(iso).toLocaleString("ko-KR", { timeZone: "Asia/Seoul", dateStyle: "short", timeStyle: "short" });
}

async function countByChannel(channelId: string, approvedOnly: boolean): Promise<number> {
  let query = supabaseAdmin
    .from("song_candidates")
    .select("id", { count: "exact", head: true })
    .eq("channel_id", channelId);
  if (approvedOnly) query = query.eq("status", "approved");
  const { count, error } = await query;
  if (error) fail("채널별 후보 건수 조회 실패", error);
  return count ?? 0;
}

export async function getChannelList(): Promise<ChannelListItem[]> {
  const { data, error } = await supabaseAdmin
    .from("ingest_channels")
    .select("id, youtube_channel_id, name, kind, default_artist, status, last_checked_at, fail_count, last_error")
    .order("created_at");
  if (error) fail("채널 목록 조회 실패", error);
  // 후보가 수천 개라 행을 내려받지 않고 채널별 head count로 센다 (PostgREST 1000행 제한 회피)
  const counts = await Promise.all(
    data.map(async (row) => ({
      total: await countByChannel(row.id as string, false),
      approved: await countByChannel(row.id as string, true),
    })),
  );
  return data.map((row, index) => ({
    id: row.id as string,
    youtubeChannelId: row.youtube_channel_id as string,
    name: row.name as string,
    kind: row.kind as ChannelListItem["kind"],
    defaultArtist: row.default_artist as string | null,
    status: row.status as ChannelListItem["status"],
    lastCheckedLabel: formatChecked(row.last_checked_at as string | null),
    failCount: row.fail_count as number,
    lastError: row.last_error as string | null,
    candidateCount: counts[index].total,
    approvedCount: counts[index].approved,
  }));
}
