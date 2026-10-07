"use server";

import { revalidatePath } from "next/cache";
import { createEvent, deleteOwnRow, updateEvent } from "@/lib/calendar/calendarStore";
import { getMonthMarkers } from "@/lib/calendar/getCalendarData";
import { isValidMonthString, parseMonth } from "@/lib/calendar/dateUtils";
import { getCurrentUser } from "@/shared/lib/auth";
import { hasRequiredConsents } from "@/lib/auth/consentStatus";
import type { CalendarActionResult, CalendarEventInput, MonthMarkers } from "@/lib/calendar/types";

function revalidateCalendar(date?: string) {
  revalidatePath("/calendar");
  if (date) revalidatePath(`/calendar/${date}`);
  else revalidatePath("/calendar/[date]", "page");
}

// 동적 페이지 캐시만 무효화하고 데이터를 돌려주지 않으므로 인증 검사를 두지 않는다.
export async function revalidateCounselRecords(): Promise<void> {
  revalidateCalendar();
  revalidatePath("/calendar/[date]/[recordId]", "page");
}

export async function createCalendarEvent(input: CalendarEventInput): Promise<CalendarActionResult> {
  const result = await createEvent(input);
  if (result.ok) revalidateCalendar(input.date);
  return result;
}

export async function updateCalendarEvent(input: CalendarEventInput & { id: string }): Promise<CalendarActionResult> {
  const result = await updateEvent(input?.id, input);
  if (result.ok) revalidateCalendar();
  return result;
}

export async function deleteCalendarEvent(id: string): Promise<CalendarActionResult> {
  const result = await deleteOwnRow("calendar_events", id);
  if (result.ok) revalidateCalendar();
  return result;
}

export async function deleteCounselRecord(id: string): Promise<CalendarActionResult> {
  const result = await deleteOwnRow("counsel_records", id);
  if (result.ok) revalidateCalendar();
  return result;
}

export async function loadMonthMarkers(
  monthKey: string,
): Promise<{ ok: true; markers: MonthMarkers } | { ok: false }> {
  if (!isValidMonthString(monthKey)) return { ok: false };
  const user = await getCurrentUser();
  if (!user || !(await hasRequiredConsents(user.id))) return { ok: false };
  const { year, month } = parseMonth(monthKey, monthKey);
  try {
    return { ok: true, markers: await getMonthMarkers(user, year, month) };
  } catch {
    return { ok: false };
  }
}
