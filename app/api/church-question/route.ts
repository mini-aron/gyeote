import { NextResponse } from "next/server";
import { FIRST_QUESTIONS, FOLLOW_UP_QUESTION } from "@/lib/church/fallbackQuestions";
import { getTimeBand } from "@/lib/greeting";
import { logQuestion } from "@/lib/church/questionLog";
import type { GeneratedQuestion } from "@/lib/church/types";

interface QuestionRequestBody {
  turnNumber: number;
  transcript: string;
}

// AI 실패 시 폴백 — 1번째 턴은 시간대 고정 질문(isFinal: false), 그 이후는
// 항상 고정 꼬리질문으로 바로 마무리한다(isFinal: true). "총 2~4턴" 범위 중
// 최소값인 2턴으로 안전하게 수렴하는 경로다.
function fallbackQuestion(turnNumber: number): GeneratedQuestion {
  if (turnNumber === 1) {
    return { ...FIRST_QUESTIONS[getTimeBand(new Date())], isFinal: false };
  }
  return { ...FOLLOW_UP_QUESTION, isFinal: true };
}

export async function POST(request: Request) {
  const body = (await request.json()) as QuestionRequestBody;
  const startedAt = Date.now();

  try {
    // 지연 import — 맥북 Ollama 서버가 꺼져 있거나 응답이 없어도 이 try
    // 블록 안에서 잡아 폴백으로 넘길 수 있게 한다 (app/api/analyze와 동일한 패턴).
    const { generateQuestion } = await import("@/lib/church/generateQuestion");
    const result = await generateQuestion({ turnNumber: body.turnNumber, transcript: body.transcript });
    await logQuestion({
      source: "ai",
      turnNumber: body.turnNumber,
      elapsedMs: Date.now() - startedAt,
      transcript: body.transcript,
      result,
    });
    return NextResponse.json(result);
  } catch (error) {
    console.error("[api/church-question] AI 질문 생성 실패, 고정 질문으로 폴백", error);
    const fallback = fallbackQuestion(body.turnNumber);
    await logQuestion({
      source: "fallback",
      turnNumber: body.turnNumber,
      elapsedMs: Date.now() - startedAt,
      transcript: body.transcript,
      result: fallback,
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(fallback);
  }
}
