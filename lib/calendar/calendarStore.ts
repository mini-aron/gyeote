import "server-only";
import { getCurrentUser } from "@/shared/lib/auth";
import { createSupabaseServerClient } from "@/shared/lib/supabase-server";
import { supabaseAdmin } from "@/shared/lib/supabase-client";
import { hasRequiredConsents } from "@/lib/auth/consentStatus";
import { isUuid } from "@/shared/lib/uuid";
import { isValidDateString, isValidTimeString } from "@/lib/calendar/dateUtils";
import type { CalendarActionResult, CalendarEventInput } from "@/lib/calendar/types";

const MAX_TITLE_LENGTH = 50;
const MAX_MEMO_LENGTH = 300;

const FAILED: CalendarActionResult = { ok: false, error: "failed" };

async function getConsentedUserId(): Promise<string | null> {
  const user = await getCurrentUser();
  if (!user || !(await hasRequiredConsents(user.id))) return null;
  return user.id;
}

function parseEventInput(
  input: unknown,
): { event_date: string; event_time: string | null; title: string; memo: string | null } | null {
  if (typeof input !== "object" || input === null) return null;
  const { date, time, title, memo } = input as Record<string, unknown>;
  if (!isValidDateString(date)) return null;
  if (typeof title !== "string") return null;
  const trimmedTitle = title.trim();
  if (trimmedTitle.length < 1 || trimmedTitle.length > MAX_TITLE_LENGTH) return null;
  const hasTime = typeof time === "string" && time !== "";
  if (time != null && time !== "" && !isValidTimeString(time)) return null;
  if (memo != null && typeof memo !== "string") return null;
  const trimmedMemo = typeof memo === "string" ? memo.trim() : "";
  if (trimmedMemo.length > MAX_MEMO_LENGTH) return null;
  return {
    event_date: date,
    event_time: hasTime ? (time as string) : null,
    title: trimmedTitle,
    memo: trimmedMemo || null,
  };
}

export async function createEvent(input: CalendarEventInput): Promise<CalendarActionResult> {
  const parsed = parseEventInput(input);
  if (!parsed) return { ok: false, error: "invalid" };
  const userId = await getConsentedUserId();
  if (!userId) return { ok: false, error: "unauthorized" };
  const { error } = await supabaseAdmin.from("calendar_events").insert({ user_id: userId, ...parsed });
  return error ? FAILED : { ok: true };
}

export async function updateEvent(id: unknown, input: CalendarEventInput): Promise<CalendarActionResult> {
  const parsed = parseEventInput(input);
  if (!isUuid(id) || !parsed) return { ok: false, error: "invalid" };
  const userId = await getConsentedUserId();
  if (!userId) return { ok: false, error: "unauthorized" };
  const { data, error } = await supabaseAdmin
    .from("calendar_events")
    .update({ ...parsed, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", userId)
    .select("id");
  if (error) return FAILED;
  return data?.length ? { ok: true } : { ok: false, error: "invalid" };
}

export async function deleteOwnRow(
  table: "calendar_events" | "counsel_records",
  id: unknown,
): Promise<CalendarActionResult> {
  if (!isUuid(id)) return { ok: false, error: "invalid" };
  const userId = await getConsentedUserId();
  if (!userId) return { ok: false, error: "unauthorized" };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from(table).delete().eq("id", id).eq("user_id", userId);
  return error ? FAILED : { ok: true };
}
