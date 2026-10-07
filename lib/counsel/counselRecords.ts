import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { detectCrisisSignal } from "@/lib/analysis/crisisSignal";
import type { AnalysisResult, ConversationTags } from "@/lib/analysis/types";
import { isUuid } from "@/shared/lib/uuid";
import { getSeoulDateString } from "@/lib/greeting";
import type { RecommendationRecord } from "@/lib/recommend/types";
import { collectUserText, validateTranscript, type CounselTranscript } from "./transcript";

const DAILY_SAVE_LIMIT = 30;
const RECENT_WINDOW_DAYS = 7;
const MAX_SITUATION_LENGTH = 100;
const MAX_TAG_LENGTH = 30;
const MAX_TAG_COUNT = 10;
const MAX_SUMMARY_LENGTH = 500;
const UNIQUE_VIOLATION = "23505";

export const MAX_SONG_REROLLS = 3;

// 에러 메시지에는 실패한 행(대화 원문)이 섞일 수 있어 코드만 남긴다.
function logFailure(label: string, error: unknown): void {
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? String((error as { code: unknown }).code)
      : error instanceof Error
        ? error.name
        : "unknown";
  console.error(`[counsel] ${label}`, code);
}

function sanitizeTagList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .slice(0, MAX_TAG_COUNT)
    .map((item) => item.slice(0, MAX_TAG_LENGTH));
}

export function readStoredTags(analysis: unknown): ConversationTags | null {
  if (typeof analysis !== "object" || analysis === null) return null;
  const { situation, themes, moods } = analysis as Record<string, unknown>;
  if (typeof situation !== "string") return null;
  return { situation, themes: sanitizeTagList(themes), moods: sanitizeTagList(moods) };
}

function buildAnalysis(tags: AnalysisResult, keepHistory: boolean) {
  const base = {
    situation: String(tags.situation ?? "").slice(0, MAX_SITUATION_LENGTH),
    themes: sanitizeTagList(tags.themes),
    moods: sanitizeTagList(tags.moods),
  };
  if (!keepHistory) return base;
  const summary = typeof tags.summary === "string" ? tags.summary.slice(0, MAX_SUMMARY_LENGTH) : "";
  return { ...base, summary };
}

export async function getMemberRecentHistory(
  admin: SupabaseClient,
  userId: string,
): Promise<RecommendationRecord[]> {
  const since = new Date(Date.now() - RECENT_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await admin
    .from("counsel_records")
    .select("verse_id, song_id, previous_song_ids, created_at")
    .eq("user_id", userId)
    .gte("created_at", since);
  if (error || !data) {
    if (error) logFailure("최근 기록 조회 실패", error);
    return [];
  }
  const records: RecommendationRecord[] = [];
  for (const row of data) {
    records.push({ songId: row.song_id, verseId: row.verse_id, date: row.created_at });
    for (const songId of row.previous_song_ids ?? []) {
      records.push({ songId, verseId: null, date: row.created_at });
    }
  }
  return records;
}

export interface SaveCounselInput {
  admin: SupabaseClient;
  userId: string;
  consented: boolean;
  clientRequestId: unknown;
  rawTranscript: unknown;
  mode: "church" | "backyard";
  tags: AnalysisResult;
  verseId: string | null;
  songId: string | null;
}

export async function saveCounselRecord(input: SaveCounselInput): Promise<string | null> {
  const { admin, userId, clientRequestId, tags } = input;
  try {
    if (!input.consented || tags.crisis === true || !isUuid(clientRequestId)) return null;

    const transcript: CounselTranscript | null = validateTranscript(input.rawTranscript);
    if (!transcript || detectCrisisSignal(collectUserText(transcript))) return null;

    const now = new Date();
    const localDate = getSeoulDateString(now);

    const [{ count, error: countError }, { data: profile }] = await Promise.all([
      admin
        .from("counsel_records")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("local_date", localDate),
      admin.from("profiles").select("keep_history").eq("user_id", userId).maybeSingle(),
    ]);
    if (countError) {
      logFailure("일일 저장 건수 조회 실패", countError);
      return null;
    }
    if ((count ?? 0) >= DAILY_SAVE_LIMIT) return null;

    const keepHistory = profile?.keep_history !== false;

    const { data, error } = await admin
      .from("counsel_records")
      .insert({
        user_id: userId,
        client_request_id: clientRequestId,
        mode: input.mode,
        verse_id: input.verseId,
        song_id: input.songId,
        analysis: buildAnalysis(tags, keepHistory),
        transcript: keepHistory ? transcript : null,
        local_date: localDate,
        result_line: null,
      })
      .select("id")
      .single();
    if (!error && data) return data.id as string;

    if (error?.code === UNIQUE_VIOLATION) {
      const { data: existing } = await admin
        .from("counsel_records")
        .select("id")
        .eq("user_id", userId)
        .eq("client_request_id", clientRequestId)
        .maybeSingle();
      return (existing?.id as string | undefined) ?? null;
    }
    logFailure("상담 기록 저장 실패", error);
    return null;
  } catch (error) {
    logFailure("상담 기록 저장 실패", error);
    return null;
  }
}

export async function saveResultLine(
  admin: SupabaseClient,
  userId: string,
  recordId: string,
  resultLine: string,
): Promise<void> {
  try {
    const { error } = await admin
      .from("counsel_records")
      .update({ result_line: resultLine, updated_at: new Date().toISOString() })
      .eq("id", recordId)
      .eq("user_id", userId);
    if (error) logFailure("응원의 글 저장 실패", error);
  } catch (error) {
    logFailure("응원의 글 저장 실패", error);
  }
}

export interface RerollTarget {
  tags: ConversationTags;
  rerollCount: number;
}

export async function readRerollTarget(
  admin: SupabaseClient,
  userId: string,
  recordId: string,
): Promise<RerollTarget | null> {
  const { data, error } = await admin
    .from("counsel_records")
    .select("analysis, previous_song_ids")
    .eq("id", recordId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) logFailure("다른 곡 대상 조회 실패", error);
  if (!data) return null;
  const tags = readStoredTags(data.analysis);
  if (!tags) return null;
  return { tags, rerollCount: (data.previous_song_ids ?? []).length };
}

export async function applySongReroll(
  admin: SupabaseClient,
  userId: string,
  recordId: string,
  newSongId: string,
): Promise<"ok" | "rejected" | "error"> {
  const { data, error } = await admin.rpc("reroll_counsel_song", {
    p_id: recordId,
    p_user_id: userId,
    p_new_song_id: newSongId,
  });
  if (error) {
    logFailure("곡 교체 실패", error);
    return "error";
  }
  return data === true ? "ok" : "rejected";
}
