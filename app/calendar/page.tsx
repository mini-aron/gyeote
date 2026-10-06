import { requireMember } from "@/lib/auth/requireMember";
import { getSeoulDateString } from "@/lib/greeting";
import { parseMonth } from "@/lib/calendar/dateUtils";
import { getMonthMarkers } from "@/lib/calendar/getCalendarData";
import { CalendarMonthView } from "@/components/calendar/CalendarMonthView";

export default async function Page({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  const user = await requireMember("calendar");
  const { month: monthParam } = await searchParams;
  const today = getSeoulDateString(new Date());
  const { year, month } = parseMonth(monthParam, today);
  const markers = await getMonthMarkers(user, year, month);
  return <CalendarMonthView year={year} month={month} today={today} markers={markers} />;
}
