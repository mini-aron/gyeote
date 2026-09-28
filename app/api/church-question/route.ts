import { NextResponse } from "next/server";
import { FIRST_QUESTIONS, FOLLOW_UP_QUESTION, type FallbackQuestion } from "@/lib/church/fallbackQuestions";
import { getTimeBand } from "@/lib/greeting";

interface QuestionRequestBody {
  turn: 1 | 2;
  transcript: string;
}

function fallbackQuestion(turn: 1 | 2): FallbackQuestion {
  return turn === 1 ? FIRST_QUESTIONS[getTimeBand(new Date())] : FOLLOW_UP_QUESTION;
}

export async function POST(request: Request) {
  const body = (await request.json()) as QuestionRequestBody;

  try {
    // 지연 import — 맥북 Ollama 서버가 꺼져 있거나 응답이 없어도 이 try
    // 블록 안에서 잡아 폴백으로 넘길 수 있게 한다 (app/api/analyze와 동일한 패턴).
    const { generateQuestion } = await import("@/lib/church/generateQuestion");
    const result = await generateQuestion({ turn: body.turn, transcript: body.transcript });
    return NextResponse.json(result);
  } catch (error) {
    console.error("[api/church-question] AI 질문 생성 실패, 고정 질문으로 폴백", error);
    return NextResponse.json(fallbackQuestion(body.turn));
  }
}
