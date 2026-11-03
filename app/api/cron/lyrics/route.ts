import { NextResponse } from "next/server";
import { isAuthorizedCron } from "@/lib/ingest/cronAuth";
import { runLyricsCollection } from "@/lib/lyrics/runLyricsCollection";

export const maxDuration = 300;

const COLLECT_BUDGET_MS = 240_000;

export async function GET(request: Request) {
  if (!isAuthorizedCron(request, process.env.CRON_SECRET)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const startedAt = Date.now();
  const lyrics = await runLyricsCollection({ deadline: startedAt + COLLECT_BUDGET_MS });
  return NextResponse.json({ lyrics, elapsedMs: Date.now() - startedAt });
}
