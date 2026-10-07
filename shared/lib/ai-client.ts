import "server-only";
import { callOllamaChat, type ChatMessage } from "./ollama-client";
import { callOpenAiChat } from "./openai-client";

export type { ChatMessage };

// 키가 있으면(배포) OpenAI, 없으면(로컬) Ollama
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

export async function callAiChat(messages: ChatMessage[]): Promise<string> {
  if (OPENAI_API_KEY) {
    return callOpenAiChat(messages, OPENAI_API_KEY);
  }
  return callOllamaChat(messages);
}
