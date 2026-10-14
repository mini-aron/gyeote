import "server-only";
import { callAiChat } from "@/shared/lib/ai-client";
import { MOOD_OPTIONS, SITUATION_OPTIONS, THEME_OPTIONS } from "@/lib/analysis/tagVocabulary";
import { parseFeelingTags, type FeelingTags } from "@/lib/search/feelingTags";

// Server Action은 클라이언트당 순차 실행이라, AI가 늦으면 같은 화면의 "더 보기"·북마크까지 줄을 선다
const AI_TIMEOUT_MS = 15_000;

const SYSTEM_PROMPT = `너는 "곁에" 서비스의 검색 도우미다. 사용자가 지금 마음을 짧게 적은 글을 읽고, 그 마음에 맞는 말씀·찬양을 찾을 태그를 아래 JSON 형식으로만 답하라. 설명, 코드블록 표시 등 JSON 이외의 텍스트는 붙이지 마라.

{
  "themes": ["<주제 목록 중 1~3개>"],
  "moods": ["<분위기 목록 중 0~2개>"],
  "situation": "<상황 목록 중 하나, 또는 null>",
  "crisis": <자해·자살·극단적 생각을 내비치는 표현이 있으면 true, 아니면 false>
}

주제 목록: ${THEME_OPTIONS.join(", ")}
분위기 목록: ${MOOD_OPTIONS.join(", ")}
상황 목록: ${SITUATION_OPTIONS.join(", ")}

규칙:
- 모든 값은 위 목록에 있는 값만 글자 그대로 쓴다. 딱 맞는 값이 없으면 가장 가까운 값을 고른다.
- themes는 최소 1개는 반드시 고른다. 글에 가장 가까운 것부터 순서대로 쓴다.
- situation은 글에 분명한 단서(예: "운전 중이야", "자려고 누웠어", "위로가 필요해")가 있을 때만 고르고, 없으면 null로 둔다 — 시간대를 추측하지 않는다.
- 글에서 직접 말하지 않은 감정(예: 죄책감, 회개)을 단정하지 않는다.
- crisis는 직접적이든 돌려 말했든 스스로를 해치거나 삶을 끝내고 싶다는 뜻이 보이면 true로 한다. 애매하면 true 쪽을 택한다.`;

// 실패(네트워크·JSON·스키마)는 그대로 던진다 — 사용자에게 어떻게 알릴지는 호출부가 정한다.
export async function interpretFeeling(text: string): Promise<FeelingTags> {
  const raw = await callAiChat(
    [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: text },
    ],
    AbortSignal.timeout(AI_TIMEOUT_MS),
  );
  return parseFeelingTags(raw);
}
