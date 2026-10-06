import { notFound } from "next/navigation";
import { requireMember } from "@/lib/auth/requireMember";
import { isValidDateString } from "@/lib/calendar/dateUtils";
import { getDayDetail } from "@/lib/calendar/getCalendarData";
import { readBookmarkedIds } from "@/lib/bookmarks/bookmarkStore";
import { DayDetailView } from "@/components/calendar/DayDetailView";

export default async function Page({ params }: { params: Promise<{ date: string }> }) {
  const { date } = await params;
  if (!isValidDateString(date)) notFound();
  const user = await requireMember("calendar", `/calendar/${date}`);
  const [{ records, events }, verseIds, songIds] = await Promise.all([
    getDayDetail(user, date),
    readBookmarkedIds("verse"),
    readBookmarkedIds("song"),
  ]);
  return (
    <DayDetailView
      date={date}
      records={records}
      events={events}
      bookmarkedIds={[...(verseIds ?? []), ...(songIds ?? [])]}
    />
  );
}
