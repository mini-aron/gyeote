import { NextResponse } from "next/server";
import { analyzeConversation as fallbackAnalyze } from "@/lib/church/analyze";
import { logAnalysis } from "@/lib/analysis/analysisLog";
import { detectCrisisSignal } from "@/lib/analysis/crisisSignal";
import type { AnalysisResult, AnalysisSource } from "@/lib/analysis/types";

interface AnalyzeRequestBody {
  transcript: string;
  source?: AnalysisSource;
}

function toFallbackResult(crisis: boolean): AnalysisResult {
  return {
    ...fallbackAnalyze(),
    direction: "",
    summary: "",
    efforts: [],
    reason: "",
    crisis,
  };
}

export async function POST(request: Request) {
  const body = (await request.json()) as AnalyzeRequestBody;
  const source: AnalysisSource = body.source === "backyard" ? "backyard" : "church";
  const startedAt = Date.now();

  // AI가 꺼져 있거나 느려도 위기 안내는 반드시 나가야 해서 AI 호출 전에 검사한다.
  if (detectCrisisSignal(body.transcript)) {
    const result = toFallbackResult(true);
    await logAnalysis({
      source: "crisis",
      elapsedMs: Date.now() - startedAt,
      transcript: body.transcript,
      result,
    });
    return NextResponse.json(result);
  }

  try {
    // 지연 import — 맥북 Ollama 서버가 꺼져 있거나 응답이 없어도 이 try
    // 블록 안에서 잡아 폴백으로 넘길 수 있게 한다.
    const { analyzeText } = await import("@/lib/analysis/analyzeText");
    const result = await analyzeText(body.transcript, source);
    await logAnalysis({
      source: "ai",
      elapsedMs: Date.now() - startedAt,
      transcript: body.transcript,
      result,
    });
    return NextResponse.json(result);
  } catch (error) {
    // F-03 예외처리: AI 응답 실패·JSON 파싱 실패 시 접속 시간대 기준으로만 폴백.
    console.error("[api/analyze] AI 분석 실패, 시간대 기반 폴백으로 전환", error);
    const fallback = toFallbackResult(false);
    await logAnalysis({
      source: "fallback",
      elapsedMs: Date.now() - startedAt,
      transcript: body.transcript,
      result: fallback,
    });
    return NextResponse.json(fallback);
  }
}
