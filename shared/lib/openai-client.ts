import "server-only";
import type { ChatMessage } from "./ollama-client";

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
// nano는 위기 신호 판별·한국어 톤 준수가 약해서 한 단계 위로
const OPENAI_MODEL = "gpt-5-mini";

export async function callOpenAiChat(messages: ChatMessage[], apiKey: string): Promise<string> {
  const response = await fetch(OPENAI_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    // reasoning 모델: temperature 미지원, 추론 토큰도 max_completion_tokens에 포함
    body: JSON.stringify({
      model: OPENAI_MODEL,
      messages,
      max_completion_tokens: 1200,
      reasoning_effort: "minimal",
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API 요청 실패: ${response.status}`);
  }

  const data = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = data.choices?.[0]?.message?.content;
  if (typeof content !== "string") {
    throw new Error("OpenAI API 응답 형식이 올바르지 않습니다.");
  }

  return content;
}
