import { notFound } from "next/navigation";
import { requireMember } from "@/lib/auth/requireMember";
import { isValidDateString } from "@/lib/calendar/dateUtils";
import { getCounselRecord } from "@/lib/calendar/getCalendarData";
import { readBookmarkedIds } from "@/lib/bookmarks/bookmarkStore";
import { isUuid } from "@/shared/lib/uuid";
import { CounselRecordDetailView } from "@/components/calendar/CounselRecordDetailView";

export default async function Page({ params }: { params: Promise<{ date: string; recordId: string }> }) {
  const { date, recordId } = await params;
  if (!isValidDateString(date) || !isUuid(recordId)) notFound();
  const user = await requireMember("calendar", `/calendar/${date}/${recordId}`);
  const [record, verseIds, songIds] = await Promise.all([
    getCounselRecord(user, date, recordId),
    readBookmarkedIds("verse"),
    readBookmarkedIds("song"),
  ]);
  if (!record) notFound();
  return (
    <CounselRecordDetailView
      date={date}
      record={record}
      bookmarkedIds={[...(verseIds ?? []), ...(songIds ?? [])]}
    />
  );
}
