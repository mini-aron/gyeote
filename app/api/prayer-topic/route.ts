import { NextResponse } from "next/server";

interface PrayerTopicRequestBody {
  summary: string;
}

const MAX_SUMMARY_LENGTH = 500;

export async function POST(request: Request) {
  const body = (await request.json()) as PrayerTopicRequestBody;
  const summary = typeof body.summary === "string" ? body.summary.trim() : "";
  if (!summary) {
    return NextResponse.json({ error: "empty_summary" }, { status: 400 });
  }

  try {
    const { generatePrayerTopic } = await import("@/lib/backyard/generatePrayerTopic");
    const topics = await generatePrayerTopic(summary.slice(0, MAX_SUMMARY_LENGTH));
    return NextResponse.json({ topics });
  } catch (error) {
    console.error("[api/prayer-topic] 기도제목 생성 실패", error);
    return NextResponse.json({ error: "prayer_topic_failed" }, { status: 500 });
  }
}
