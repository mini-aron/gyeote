import { NextResponse } from "next/server";
import { pickResultLine } from "@/lib/church/resultLines";
import { logResultLine } from "@/lib/church/resultLineLog";
import type { AnalysisResult } from "@/lib/analysis/types";
import type { RecommendationRecord, RecommendResult } from "@/lib/recommend/types";
import { getCurrentUser } from "@/shared/lib/auth";
import { hasRequiredConsents } from "@/lib/auth/consentStatus";
import { isUuid } from "@/shared/lib/uuid";
import {
  MAX_SONG_REROLLS,
  applySongReroll,
  getMemberRecentHistory,
  readRerollTarget,
  saveCounselRecord,
  saveResultLine,
} from "@/lib/counsel/counselRecords";

interface RecommendRequestBody {
  tags: AnalysisResult;
  history?: RecommendationRecord[];
  include?: { verse?: boolean; song?: boolean };
  mode?: "church" | "backyard";
  text?: string;
  transcript?: unknown;
  clientRequestId?: unknown;
  counselRecordId?: unknown;
}

async function findMember() {
  try {
    return await getCurrentUser();
  } catch {
    return null;
  }
}

async function writeBackyardEncouragement(
  body: RecommendRequestBody,
  verse: RecommendResult["verse"],
  song: RecommendResult["song"],
): Promise<string | undefined> {
  // 폴백 분석이면 글감이 없어 일반론이 되므로 명세대로 글을 생략한다.
  if (!body.text || !body.tags.summary) return undefined;

  const startedAt = Date.now();
  try {
    const { generateEncouragement } = await import("@/lib/backyard/generateEncouragement");
    const encouragement = await generateEncouragement({
      text: body.text,
      analysis: body.tags,
      verse,
      song,
    });
    await logResultLine({
      source: "ai",
      mode: "backyard",
      elapsedMs: Date.now() - startedAt,
      resultLine: encouragement,
    });
    return encouragement;
  } catch (error) {
    console.error("[api/recommend] 뒤뜰 응원의 글 생성 실패, 글 없이 진행", error instanceof Error ? error.name : "unknown");
    await logResultLine({
      source: "fallback",
      mode: "backyard",
      elapsedMs: Date.now() - startedAt,
      resultLine: "",
      error: error instanceof Error ? error.message : String(error),
    });
    return undefined;
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RecommendRequestBody;
    // 지연 import — Supabase 환경변수가 없으면 supabaseAdmin은 모듈 로드 시점에
    // 던지므로, try 블록 안에서 불러와야 에러를 여기서 잡아 안내 응답으로 바꿀 수 있다.
    const { supabaseAdmin } = await import("@/shared/lib/supabase-client");
    const { recommend } = await import("@/lib/recommend/recommend");

    const user = await findMember();
    const history = Array.isArray(body.history) ? body.history : [];
    const isSongRetry = body.include?.verse === false;

    const consentPromise =
      user && !isSongRetry && body.transcript !== undefined && isUuid(body.clientRequestId)
        ? hasRequiredConsents(user.id)
        : null;
    // 앞선 await가 먼저 던져 consentPromise를 아무도 기다리지 않게 돼도 unhandled rejection이 되지 않도록 한다.
    consentPromise?.catch(() => {});

    const rerollId = user && isSongRetry && isUuid(body.counselRecordId) ? body.counselRecordId : null;
    const [memberHistory, rerollTarget] = await Promise.all([
      user ? getMemberRecentHistory(supabaseAdmin, user.id) : [],
      user && rerollId ? readRerollTarget(supabaseAdmin, user.id, rerollId) : null,
    ]);
    history.push(...memberHistory);

    if (user && rerollId) {
      // 다른 곡 분기는 실패해도 200 — 4xx면 클라이언트가 결과 화면 전체를 잃는다.
      const target = rerollTarget;
      if (target && target.rerollCount >= MAX_SONG_REROLLS) {
        return NextResponse.json({ verse: null, song: null, counselRecordId: rerollId, rerollStatus: "limit" });
      }
      const { song } = await recommend({
        tags: { ...body.tags, ...target?.tags },
        history,
        include: { verse: false, song: true },
      });
      if (!song) {
        return NextResponse.json({ verse: null, song: null, counselRecordId: rerollId, rerollStatus: "no_song" });
      }
      if (!target) {
        return NextResponse.json({ verse: null, song, counselRecordId: null, rerollStatus: "not_saved" });
      }
      const applied = await applySongReroll(supabaseAdmin, user.id, rerollId, song.id);
      if (applied === "rejected") {
        return NextResponse.json({ verse: null, song: null, counselRecordId: rerollId, rerollStatus: "limit" });
      }
      return NextResponse.json({
        verse: null,
        song,
        counselRecordId: rerollId,
        rerollStatus: applied === "ok" ? "ok" : "not_saved",
      });
    }

    const { verse, song } = await recommend({
      tags: body.tags,
      history,
      include: body.include,
    });

    const mode = body.mode === "backyard" ? "backyard" : "church";
    // 동의 조회 실패는 AI 호출 전에 500으로 끝나야 하므로 결과 글 생성보다 먼저 확정한다.
    const consented = consentPromise ? await consentPromise : false;
    const counselPromise = (async (): Promise<string | null> => {
      if (!(user && !isSongRetry && body.transcript !== undefined)) return null;
      return saveCounselRecord({
        admin: supabaseAdmin,
        userId: user.id,
        consented,
        clientRequestId: body.clientRequestId,
        rawTranscript: body.transcript,
        mode,
        tags: body.tags,
        verseId: verse?.id ?? null,
        songId: song?.id ?? null,
      });
    })();

    // 곡만 다시 뽑는 재시도(include.verse === false)에서는 결과 글을 새로
    // 만들지 않는다 — 처음 만들어진 글이 그대로 유지되도록 클라이언트에
    // resultLine 필드를 아예 보내지 않는다.
    const result: RecommendResult = { verse, song, counselRecordId: null };
    const lineGeneration = (async (): Promise<string | null> => {
      let generatedLine: string | null = null;
      if (body.include?.verse !== false && body.mode === "backyard") {
        // undefined는 클라이언트가 "기존 글 유지"로 해석하므로 빈 문자열로 보낸다.
        generatedLine = (await writeBackyardEncouragement(body, verse, song)) ?? null;
        result.resultLine = generatedLine ?? "";
      } else if (body.include?.verse !== false) {
        const startedAt = Date.now();
        try {
          // 지연 import — app/api/analyze와 동일한 패턴: Ollama 실패를 이 try
          // 블록 안에서 잡아 폴백 문구로 넘긴다.
          const { generateResultLine } = await import("@/lib/church/generateResultLine");
          result.resultLine = await generateResultLine({ analysis: body.tags, verse, song });
          generatedLine = result.resultLine;
          await logResultLine({
            source: "ai",
            elapsedMs: Date.now() - startedAt,
            resultLine: result.resultLine,
          });
        } catch (error) {
          console.error("[api/recommend] 결과 글 생성 실패, 고정 문구로 폴백", error instanceof Error ? error.name : "unknown");
          result.resultLine = pickResultLine();
          await logResultLine({
            source: "fallback",
            elapsedMs: Date.now() - startedAt,
            resultLine: result.resultLine,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }
      return generatedLine;
    })();

    const [counselRecordId, generatedLine] = await Promise.all([counselPromise, lineGeneration]);
    result.counselRecordId = counselRecordId;

    if (user && counselRecordId && generatedLine) {
      await saveResultLine(supabaseAdmin, user.id, counselRecordId, generatedLine);
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("[api/recommend] failed", error instanceof Error ? error.name : "unknown");
    return NextResponse.json(
      { verse: null, song: null, error: "recommend_failed" },
      { status: 500 },
    );
  }
}
