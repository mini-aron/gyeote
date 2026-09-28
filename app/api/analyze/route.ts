import { NextResponse } from "next/server";
import { analyzeConversation as fallbackAnalyze } from "@/lib/church/analyze";
import type { AnalysisResult } from "@/lib/analysis/types";

interface AnalyzeRequestBody {
  transcript: string;
}

function toFallbackResult(): AnalysisResult {
  return {
    ...fallbackAnalyze(),
    direction: "",
    summary: "",
    efforts: [],
    reason: "",
  };
}

export async function POST(request: Request) {
  const body = (await request.json()) as AnalyzeRequestBody;

  try {
    // 지연 import — NVIDIA_API_KEY가 없으면 nvidia-client는 모듈 로드 시점에
    // 던지므로, try 블록 안에서 불러와야 여기서 잡아 폴백으로 넘길 수 있다.
    const { analyzeText } = await import("@/lib/analysis/analyzeText");
    const result = await analyzeText(body.transcript);
    return NextResponse.json(result);
  } catch (error) {
    // F-03 예외처리: AI 응답 실패·JSON 파싱 실패 시 접속 시간대 기준으로만 폴백.
    console.error("[api/analyze] AI 분석 실패, 시간대 기반 폴백으로 전환", error);
    return NextResponse.json(toFallbackResult());
  }
}
