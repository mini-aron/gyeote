import { NextResponse } from "next/server";
import { recommend } from "@/lib/recommend/recommend";
import { pickResultLine } from "@/lib/church/resultLines";
import { logResultLine } from "@/lib/church/resultLineLog";
import type { AnalysisResult } from "@/lib/analysis/types";
import type { RecommendationRecord, RecommendResult } from "@/lib/recommend/types";

interface RecommendRequestBody {
  tags: AnalysisResult;
  history?: RecommendationRecord[];
  include?: { verse?: boolean; song?: boolean };
  mode?: "church" | "backyard";
  text?: string;
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
    console.error("[api/recommend] 뒤뜰 응원의 글 생성 실패, 글 없이 진행", error);
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

    const { verse, song } = await recommend({
      supabase: supabaseAdmin,
      tags: body.tags,
      history: body.history ?? [],
      include: body.include,
    });

    // 곡만 다시 뽑는 재시도(include.verse === false)에서는 결과 글을 새로
    // 만들지 않는다 — 처음 만들어진 글이 그대로 유지되도록 클라이언트에
    // resultLine 필드를 아예 보내지 않는다.
    const result: RecommendResult = { verse, song };
    if (body.include?.verse !== false && body.mode === "backyard") {
      // undefined는 클라이언트가 "기존 글 유지"로 해석하므로 빈 문자열로 보낸다.
      result.resultLine = (await writeBackyardEncouragement(body, verse, song)) ?? "";
    } else if (body.include?.verse !== false) {
      const startedAt = Date.now();
      try {
        // 지연 import — app/api/analyze와 동일한 패턴: Ollama 실패를 이 try
        // 블록 안에서 잡아 폴백 문구로 넘긴다.
        const { generateResultLine } = await import("@/lib/church/generateResultLine");
        result.resultLine = await generateResultLine({ analysis: body.tags, verse, song });
        await logResultLine({
          source: "ai",
          elapsedMs: Date.now() - startedAt,
          resultLine: result.resultLine,
        });
      } catch (error) {
        console.error("[api/recommend] 결과 글 생성 실패, 고정 문구로 폴백", error);
        result.resultLine = pickResultLine();
        await logResultLine({
          source: "fallback",
          elapsedMs: Date.now() - startedAt,
          resultLine: result.resultLine,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("[api/recommend] failed", error);
    return NextResponse.json(
      { verse: null, song: null, error: "recommend_failed" },
      { status: 500 },
    );
  }
}
