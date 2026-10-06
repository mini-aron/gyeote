import "server-only";
import type { User } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/shared/lib/supabase-server";
import { supabaseAdmin } from "@/shared/lib/supabase-client";
import { readStoredTags } from "@/lib/counsel/counselRecords";
import { daysInMonth, formatMonthKey } from "@/lib/calendar/dateUtils";
import type { DayCounselRecord, DayEvent, MonthMarkers } from "@/lib/calendar/types";
import type { ChurchTurn } from "@/lib/counsel/transcript";

export async function getMonthMarkers(user: User, year: number, month: number): Promise<MonthMarkers> {
  const key = formatMonthKey(year, month);
  const from = `${key}-01`;
  const to = `${key}-${String(daysInMonth(year, month)).padStart(2, "0")}`;
  const supabase = await createSupabaseServerClient();
  const [counsel, events] = await Promise.all([
    supabase.from("counsel_records").select("local_date").eq("user_id", user.id).gte("local_date", from).lte("local_date", to),
    supabase.from("calendar_events").select("event_date").eq("user_id", user.id).gte("event_date", from).lte("event_date", to),
  ]);
  if (counsel.error || events.error) throw new Error("calendar_markers_failed");
  return {
    counselDates: [...new Set((counsel.data ?? []).map((row) => row.local_date as string))],
    eventDates: [...new Set((events.data ?? []).map((row) => row.event_date as string))],
  };
}

function readTranscript(raw: unknown): { church: ChurchTurn[] | null; backyardText: string | null } {
  if (typeof raw !== "object" || raw === null) return { church: null, backyardText: null };
  const { church, backyard } = raw as { church?: unknown; backyard?: { text?: unknown } };
  return {
    church: Array.isArray(church) ? (church as ChurchTurn[]) : null,
    backyardText: typeof backyard?.text === "string" ? backyard.text : null,
  };
}

export async function getDayDetail(
  user: User,
  date: string,
): Promise<{ records: DayCounselRecord[]; events: DayEvent[] }> {
  const supabase = await createSupabaseServerClient();
  const [recordRows, eventRows] = await Promise.all([
    supabase
      .from("counsel_records")
      .select("id, mode, verse_id, song_id, result_line, analysis, transcript, created_at")
      .eq("user_id", user.id)
      .eq("local_date", date)
      .order("created_at", { ascending: true }),
    supabase
      .from("calendar_events")
      .select("id, event_time, title, memo")
      .eq("user_id", user.id)
      .eq("event_date", date)
      .order("event_time", { ascending: true, nullsFirst: true })
      .order("created_at", { ascending: true }),
  ]);

  if (recordRows.error || eventRows.error) throw new Error("calendar_day_failed");
  const rows = recordRows.data ?? [];
  const verseIds = [...new Set(rows.map((row) => row.verse_id).filter(Boolean))] as string[];
  const songIds = [...new Set(rows.map((row) => row.song_id).filter(Boolean))] as string[];
  const [verses, songs] = await Promise.all([
    verseIds.length
      ? supabaseAdmin
          .from("verses")
          .select("id, reference, body, translation, meaning, application, is_active")
          .in("id", verseIds)
      : { data: [] },
    songIds.length
      ? supabaseAdmin.from("songs").select("id, title, artist, listen_url, summary, is_active").in("id", songIds)
      : { data: [] },
  ]);
  if ("error" in verses && verses.error) throw new Error("calendar_verses_failed");
  if ("error" in songs && songs.error) throw new Error("calendar_songs_failed");
  const verseById = new Map((verses.data ?? []).map((row) => [row.id as string, row]));
  const songById = new Map((songs.data ?? []).map((row) => [row.id as string, row]));

  const records: DayCounselRecord[] = rows.map((row) => {
    const verse = row.verse_id ? verseById.get(row.verse_id) : undefined;
    const song = row.song_id ? songById.get(row.song_id) : undefined;
    return {
      id: row.id,
      mode: row.mode,
      createdAt: row.created_at,
      resultLine: row.result_line,
      themes: readStoredTags(row.analysis)?.themes ?? [],
      verse: verse
        ? {
            id: verse.id,
            reference: verse.reference,
            body: verse.body,
            translation: verse.translation,
            meaning: verse.meaning ?? null,
            application: verse.application ?? null,
            isActive: verse.is_active,
          }
        : null,
      song: song
        ? {
            id: song.id,
            title: song.title,
            artist: song.artist,
            listenUrl: song.listen_url ?? null,
            summary: song.summary ?? null,
            isActive: song.is_active,
          }
        : null,
      ...readTranscript(row.transcript),
    };
  });

  const events: DayEvent[] = (eventRows.data ?? []).map((row) => ({
    id: row.id,
    time: row.event_time,
    title: row.title,
    memo: row.memo,
  }));
  return { records, events };
}
