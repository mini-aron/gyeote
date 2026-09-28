import "server-only";

const NVIDIA_API_BASE_URL = "https://integrate.api.nvidia.com/v1";
const NVIDIA_MODEL = "meta/llama-3.3-70b-instruct";

const apiKey = process.env.NVIDIA_API_KEY;

if (!apiKey) {
  throw new Error("NVIDIA_API_KEY 환경변수가 설정되지 않았습니다.");
}

export interface ChatMessage {
  role: "system" | "user";
  content: string;
}

/**
 * NVIDIA NIM(OpenAI 호환 chat completions)을 호출해 응답 텍스트만 돌려준다.
 * 서버 코드에서만 import할 것 — 키는 클라이언트에 절대 노출하지 않는다.
 */
export async function callNvidiaChat(messages: ChatMessage[]): Promise<string> {
  const response = await fetch(`${NVIDIA_API_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: NVIDIA_MODEL,
      messages,
      temperature: 0.4,
      max_tokens: 600,
    }),
  });

  if (!response.ok) {
    throw new Error(`NVIDIA API 요청 실패: ${response.status}`);
  }

  const data = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = data.choices?.[0]?.message?.content;
  if (typeof content !== "string") {
    throw new Error("NVIDIA API 응답 형식이 올바르지 않습니다.");
  }

  return content;
}
