import "server-only";
import { appendFile, mkdir } from "node:fs/promises";
import path from "node:path";
import type { AnalysisResult } from "./types";

const LOG_DIR = path.join(process.cwd(), ".logs");
const LOG_FILE = path.join(LOG_DIR, "analysis.log");

interface AnalysisLogEntry {
  source: "ai" | "fallback" | "crisis";
  elapsedMs: number;
  transcript: string;
  result: AnalysisResult;
}

/**
 * 로컬 Ollama 분석 호출 기록 — 입력(transcript)·출력(파싱된 태그)·소요시간을
 * .logs/analysis.log에 JSON Lines로 누적한다. 로컬 전용 기록이라 gitignore
 * 대상이고, 쓰기 실패해도 분석 응답 자체를 막지 않는다.
 */
export async function logAnalysis(entry: AnalysisLogEntry): Promise<void> {
  if (process.env.NODE_ENV === "production") return;
  try {
    await mkdir(LOG_DIR, { recursive: true });
    const line = JSON.stringify({ timestamp: new Date().toISOString(), ...entry });
    await appendFile(LOG_FILE, `${line}\n`, "utf-8");
  } catch (error) {
    console.error("[analysisLog] 로그 파일 쓰기 실패", error);
  }
}
