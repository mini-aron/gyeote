import "server-only";
import { OLLAMA_MODEL } from "./ollama-model";

// 로컬 개발 환경에서는 맥북에서 도는 Ollama가 기본 포트에 떠 있으니 그대로 쓴다.
// 프로덕션(Vercel)에서는 맥북을 가리키는 터널 주소로 반드시 바꿔야 한다 —
// localhost는 Vercel 서버리스 함수 입장에서 자기 자신을 가리킬 뿐이다.
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL ?? "http://localhost:11434";

export interface ChatMessage {
  role: "system" | "user";
  content: string;
}

/**
 * 맥북 로컬 Ollama 서버(OpenAI 호환 chat completions)를 호출해 응답 텍스트만
 * 돌려준다. 서버 코드에서만 import할 것.
 */
export async function callOllamaChat(messages: ChatMessage[]): Promise<string> {
  const response = await fetch(`${OLLAMA_BASE_URL}/v1/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      messages,
      temperature: 0.4,
      max_tokens: 600,
      stream: false,
    }),
  });

  if (!response.ok) {
    throw new Error(`Ollama API 요청 실패: ${response.status}`);
  }

  const data = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = data.choices?.[0]?.message?.content;
  if (typeof content !== "string") {
    throw new Error("Ollama API 응답 형식이 올바르지 않습니다.");
  }

  return content;
}
