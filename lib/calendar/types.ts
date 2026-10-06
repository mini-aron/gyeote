import type { ChurchTurn } from "@/lib/counsel/transcript";
import type { SongResult, VerseResult } from "@/lib/recommend/types";

export interface MonthMarkers {
  counselCounts: Record<string, number>;
  eventDates: string[];
}

export interface DayEvent {
  id: string;
  time: string | null;
  title: string;
  memo: string | null;
}

export interface DayCounselRecord {
  id: string;
  mode: "church" | "backyard";
  createdAt: string;
  resultLine: string | null;
  themes: string[];
  verse: (VerseResult & { isActive: boolean }) | null;
  song: (SongResult & { isActive: boolean }) | null;
  church: ChurchTurn[] | null;
  backyardText: string | null;
}

export interface CalendarEventInput {
  date: string;
  time?: string | null;
  title: string;
  memo?: string | null;
}

export type CalendarActionResult = { ok: true } | { ok: false; error: string };
