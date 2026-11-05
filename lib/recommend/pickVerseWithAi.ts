import "server-only";
import { callAiChat } from "@/shared/lib/ai-client";
import type { AnalysisResult } from "@/lib/analysis/types";
import type { TaggedVerse } from "@/lib/catalog/catalogCache";
import { parseVersePick } from "./ranking";

export type VersePickContext = Pick<AnalysisResult, "summary" | "direction" | "reason">;

const PICK_TIMEOUT_MS = 10_000;
const BODY_PREVIEW_LENGTH = 140;
const MEANING_PREVIEW_LENGTH = 100;

const SYSTEM_PROMPT = `너는 "곁에" 서비스에서 사용자와 나눈 대화를 읽고, 지금 그 사람 마음에 가장 닿을 성경 말씀을 후보 목록 안에서 하나 고르는 역할이다. {"pick": <후보 번호>} 형식의 JSON으로만 답하라. 설명이나 다른 텍스트는 붙이지 마라.

고르는 기준:
- 대화 요약에 나온 구체적인 상황·감정(예: 일에 지침, 관계로 속상함, 감사한 일)에 가장 직접 닿는 구절
- 구절만 따로 읽어도 지금 이 사람에게 따뜻하게 읽히는 구절 — 원래 맥락이 심판·전쟁·책망이라 엉뚱하게 읽힐 수 있는 구절은 피한다
- 대화에서 직접 말하지 않은 죄책감·회개·헌신 요구를 전제하는 구절은 고르지 않는다
- 반드시 목록에 있는 번호 중 하나만 고른다`;

function preview(text: string, length: number): string {
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length > length ? `${flat.slice(0, length)}…` : flat;
}

export async function pickVerseWithAi(
  context: VersePickContext,
  candidates: TaggedVerse[],
): Promise<TaggedVerse> {
  const list = candidates
    .map((verse, index) => {
      const meaning = verse.meaning ? ` (뜻: ${preview(verse.meaning, MEANING_PREVIEW_LENGTH)})` : "";
      return `${index + 1}. ${verse.reference} — ${preview(verse.body, BODY_PREVIEW_LENGTH)}${meaning}`;
    })
    .join("\n");

  const userContent = [
    `대화 요약: ${context.summary}`,
    `추천 방향: ${context.direction}`,
    `추천 이유: ${context.reason}`,
    "",
    "후보 말씀:",
    list,
  ].join("\n");

  const raw = await callAiChat(
    [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userContent },
    ],
    AbortSignal.timeout(PICK_TIMEOUT_MS),
  );
  return candidates[parseVersePick(raw, candidates.length)];
}
