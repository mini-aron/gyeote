import { notFound } from "next/navigation";
import { requireMember } from "@/lib/auth/requireMember";
import { isValidDateString } from "@/lib/calendar/dateUtils";
import { getDayDetail } from "@/lib/calendar/getCalendarData";
import { DayDetailView } from "@/components/calendar/DayDetailView";

export default async function Page({ params }: { params: Promise<{ date: string }> }) {
  const { date } = await params;
  if (!isValidDateString(date)) notFound();
  const user = await requireMember("calendar", `/calendar/${date}`);
  const { records, events } = await getDayDetail(user, date);
  return <DayDetailView date={date} records={records} events={events} />;
}
