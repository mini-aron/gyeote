import "server-only";
import { appendFile, mkdir } from "node:fs/promises";
import path from "node:path";

const LOG_DIR = path.join(process.cwd(), ".logs");
const LOG_FILE = path.join(LOG_DIR, "result-line.log");

interface ResultLineLogEntry {
  source: "ai" | "fallback";
  mode?: "church" | "backyard";
  elapsedMs: number;
  resultLine: string;
  error?: string;
}

/**
 * F-07 결과 글 생성 호출 기록 — lib/analysis/analysisLog.ts와 동일한 패턴으로
 * .logs/result-line.log에 JSON Lines로 누적한다. 로컬 전용 기록이라
 * gitignore 대상이고, 쓰기 실패해도 응답 자체를 막지 않는다.
 */
export async function logResultLine(entry: ResultLineLogEntry): Promise<void> {
  try {
    await mkdir(LOG_DIR, { recursive: true });
    const line = JSON.stringify({ timestamp: new Date().toISOString(), ...entry });
    await appendFile(LOG_FILE, `${line}\n`, "utf-8");
  } catch (error) {
    console.error("[resultLineLog] 로그 파일 쓰기 실패", error);
  }
}
