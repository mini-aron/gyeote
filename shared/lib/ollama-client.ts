import "server-only";
import { OLLAMA_MODEL } from "./ollama-model";

// 원격 배포에서는 맥북 터널 주소 필수 (localhost는 서버리스 함수 자신을 가리킴)
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL ?? "http://localhost:11434";

// Cloudflare Access 보호 터널용 — 로컬에선 비어 있어 생략됨
const CF_ACCESS_CLIENT_ID = process.env.CF_ACCESS_CLIENT_ID;
const CF_ACCESS_CLIENT_SECRET = process.env.CF_ACCESS_CLIENT_SECRET;

// 기본 5분 유휴 언로드 시 재로딩이 수십 초 걸려서 늘려둠
const OLLAMA_KEEP_ALIVE = "30m";

export interface ChatMessage {
  role: "system" | "user";
  content: string;
}

// OpenAI 호환 API는 keep_alive를 무시할 수 있어 네이티브 /api/chat 사용
export async function callOllamaChat(messages: ChatMessage[]): Promise<string> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (CF_ACCESS_CLIENT_ID && CF_ACCESS_CLIENT_SECRET) {
    headers["CF-Access-Client-Id"] = CF_ACCESS_CLIENT_ID;
    headers["CF-Access-Client-Secret"] = CF_ACCESS_CLIENT_SECRET;
  }

  const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      messages,
      stream: false,
      keep_alive: OLLAMA_KEEP_ALIVE,
      options: {
        temperature: 0.4,
        num_predict: 600,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Ollama API 요청 실패: ${response.status}`);
  }

  const data = (await response.json()) as {
    message?: { content?: string };
  };
  const content = data.message?.content;
  if (typeof content !== "string") {
    throw new Error("Ollama API 응답 형식이 올바르지 않습니다.");
  }

  return content;
}
