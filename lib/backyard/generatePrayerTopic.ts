import "server-only";
import { callOllamaChat } from "@/shared/lib/ollama-client";
import { sanitizeGeneratedText } from "@/lib/church/generateResultLine";

const SYSTEM_PROMPT = `너는 "곁에" 서비스에서 사용자가 털어놓은 내용의 요약을 받아, 사용자가 직접 기도할 때 쓸 수 있는 기도제목으로 정리해주는 AI다.

출력 형식:
- 기도제목 1~3개를 한 줄에 하나씩 쓴다
- 각 줄은 "- "로 시작한다
- 각 줄은 사용자 본인이 드리는 기도 형태의 존댓말 한 문장으로, "~하게 해주세요" / "~할 수 있도록 도와주세요"처럼 끝맺는다
- 기도제목 줄 이외의 설명, 인사말, 제목은 붙이지 않는다

규칙:
- 요약에 나온 상황·감정만 쓴다. 요약에 없는 사람·사건·원인을 지어내지 않는다
- 성경 구절을 인용하지 않는다
- 결과를 약속하거나 예언하는 표현을 쓰지 않는다`;

const MAX_LINES = 3;
const MAX_LINE_LENGTH = 120;

function parsePrayerTopics(raw: string): string[] {
  const topics = sanitizeGeneratedText(raw)
    .split("\n")
    .map((line) => line.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, "").trim())
    .filter((line) => line.length > 0);

  if (topics.length === 0 || topics.some((line) => line.length > MAX_LINE_LENGTH)) {
    throw new Error(`기도제목 응답 형식이 올바르지 않습니다: ${raw}`);
  }
  return topics.slice(0, MAX_LINES);
}

/**
 * F-04 [기도제목으로 정리하기]. 형식 위반은 1회만 재시도하고 그래도 실패하면 던진다.
 */
export async function generatePrayerTopic(summary: string): Promise<string[]> {
  const call = async () =>
    parsePrayerTopics(
      await callOllamaChat([
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `요약: ${summary}\n\n이 내용을 기도제목으로 정리해줘.` },
      ]),
    );

  try {
    return await call();
  } catch {
    return await call();
  }
}
