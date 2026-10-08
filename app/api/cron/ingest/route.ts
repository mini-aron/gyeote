import { NextResponse } from "next/server";
import { createCronDb } from "@/lib/ingest/createCronDb";
import { isAuthorizedCron } from "@/lib/ingest/cronAuth";
import { runChannelIngest } from "@/lib/ingest/runChannelIngest";
import { createYoutubeSource } from "@/lib/ingest/youtubeSource";

export const maxDuration = 300;

// 단계별 예산 배분은 임시안 (ingest 90 / process 120 / verify 30, 합계 240초)
const INGEST_BUDGET_MS = 90_000;
const HARD_DEADLINE_MS = 270_000;

export async function GET(request: Request) {
  if (!isAuthorizedCron(request, process.env.CRON_SECRET)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const startedAt = Date.now();
  const hardDeadline = startedAt + HARD_DEADLINE_MS;
  const ingest = await runChannelIngest({
    db: createCronDb(),
    youtube: createYoutubeSource(),
    deadline: Math.min(startedAt + INGEST_BUDGET_MS, hardDeadline),
  });

  return NextResponse.json({ ingest, elapsedMs: Date.now() - startedAt });
}
