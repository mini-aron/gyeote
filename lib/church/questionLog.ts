import "server-only";
import { appendFile, mkdir } from "node:fs/promises";
import path from "node:path";
import type { GeneratedQuestion } from "./types";

const LOG_DIR = path.join(process.cwd(), ".logs");
const LOG_FILE = path.join(LOG_DIR, "church-question.log");

interface QuestionLogEntry {
  source: "ai" | "fallback";
  turnNumber: number;
  elapsedMs: number;
  transcript: string;
  result: GeneratedQuestion;
  // fallback일 때만 — 왜 AI 생성이 실패했는지(스키마 불일치/파싱 실패 등)를
  // 남겨야 간헐적 폴백 원인을 나중에 추적할 수 있다.
  error?: string;
}

/**
 * F-05 질문 생성 호출 기록 — 입력(transcript)·출력(질문/선택지)·소요시간·
 * AI/폴백 여부를 .logs/church-question.log에 JSON Lines로 누적한다.
 * 로컬 전용 기록이라 gitignore 대상이고, 쓰기 실패해도 질문 응답 자체를
 * 막지 않는다 (lib/analysis/analysisLog.ts와 동일한 패턴).
 */
export async function logQuestion(entry: QuestionLogEntry): Promise<void> {
  if (process.env.NODE_ENV === "production") return;
  try {
    await mkdir(LOG_DIR, { recursive: true });
    const line = JSON.stringify({ timestamp: new Date().toISOString(), ...entry });
    await appendFile(LOG_FILE, `${line}\n`, "utf-8");
  } catch (error) {
    console.error("[questionLog] 로그 파일 쓰기 실패", error);
  }
}
