import { NextResponse } from "next/server";
import { recommend } from "@/lib/recommend/recommend";
import type { ConversationTags } from "@/lib/church/types";
import type { RecommendationRecord } from "@/lib/recommend/types";

interface RecommendRequestBody {
  tags: ConversationTags;
  history?: RecommendationRecord[];
  include?: { verse?: boolean; song?: boolean };
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RecommendRequestBody;
    // 지연 import — Supabase 환경변수가 없으면 supabaseAdmin은 모듈 로드 시점에
    // 던지므로, try 블록 안에서 불러와야 에러를 여기서 잡아 안내 응답으로 바꿀 수 있다.
    const { supabaseAdmin } = await import("@/shared/lib/supabase-client");

    const result = await recommend({
      supabase: supabaseAdmin,
      tags: body.tags,
      history: body.history ?? [],
      include: body.include,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("[api/recommend] failed", error);
    return NextResponse.json(
      { verse: null, song: null, error: "recommend_failed" },
      { status: 500 },
    );
  }
}
