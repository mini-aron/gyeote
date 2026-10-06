"use server";

import { revalidatePath } from "next/cache";
import { createEvent, deleteOwnRow, updateEvent } from "@/lib/calendar/calendarStore";
import type { CalendarActionResult, CalendarEventInput } from "@/lib/calendar/types";

function revalidateCalendar(date?: string) {
  revalidatePath("/calendar");
  if (date) revalidatePath(`/calendar/${date}`);
  else revalidatePath("/calendar/[date]", "page");
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
