export interface ChurchTurn {
  question: string;
  choices: string[];
  answer: string;
  answerType: "choice" | "free";
}

export interface CounselTranscript {
  version: 1;
  church?: ChurchTurn[];
  backyard?: { text: string };
}

const MAX_CHURCH_TURNS = 10;
const MAX_QUESTION_LENGTH = 300;
const MAX_ANSWER_LENGTH = 200;
const MAX_CHOICES = 6;
const MAX_CHOICE_LENGTH = 50;
const MAX_BACKYARD_LENGTH = 1000;
// counsel_records.transcript의 pg_column_size 한도(16384)보다 낮게 잡아 jsonb 오버헤드를 흡수한다.
const MAX_SERIALIZED_BYTES = 15000;

export function buildChurchTurn(
  question: string,
  choices: string[],
  answer: string,
  answerType: ChurchTurn["answerType"],
): ChurchTurn {
  return {
    question: question.slice(0, MAX_QUESTION_LENGTH),
    choices: choices.slice(0, MAX_CHOICES).map((choice) => choice.slice(0, MAX_CHOICE_LENGTH)),
    answer: answer.slice(0, MAX_ANSWER_LENGTH),
    answerType,
  };
}

function hasOnlyKeys(value: object, allowed: readonly string[]): boolean {
  return Object.keys(value).every((key) => allowed.includes(key));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseChurchTurn(raw: unknown): ChurchTurn | null {
  if (!isRecord(raw) || !hasOnlyKeys(raw, ["question", "choices", "answer", "answerType"])) {
    return null;
  }
  const { question, choices, answer, answerType } = raw;
  if (typeof question !== "string" || question.length > MAX_QUESTION_LENGTH) return null;
  if (typeof answer !== "string" || answer.length > MAX_ANSWER_LENGTH) return null;
  if (answerType !== "choice" && answerType !== "free") return null;
  if (!Array.isArray(choices) || choices.length > MAX_CHOICES) return null;
  if (!choices.every((c) => typeof c === "string" && c.length <= MAX_CHOICE_LENGTH)) return null;
  return { question, choices: choices as string[], answer, answerType };
}

export function validateTranscript(raw: unknown): CounselTranscript | null {
  if (!isRecord(raw) || !hasOnlyKeys(raw, ["version", "church", "backyard"])) return null;
  if (raw.version !== 1) return null;

  const result: CounselTranscript = { version: 1 };

  if (raw.church !== undefined) {
    if (!Array.isArray(raw.church) || raw.church.length === 0 || raw.church.length > MAX_CHURCH_TURNS) {
      return null;
    }
    const turns: ChurchTurn[] = [];
    for (const item of raw.church) {
      const turn = parseChurchTurn(item);
      if (!turn) return null;
      turns.push(turn);
    }
    result.church = turns;
  }

  if (raw.backyard !== undefined) {
    if (!isRecord(raw.backyard) || !hasOnlyKeys(raw.backyard, ["text"])) return null;
    const text = raw.backyard.text;
    if (typeof text !== "string" || text.length === 0 || text.length > MAX_BACKYARD_LENGTH) {
      return null;
    }
    result.backyard = { text };
  }

  if (!result.church && !result.backyard) return null;
  if (new TextEncoder().encode(JSON.stringify(result)).length > MAX_SERIALIZED_BYTES) return null;
  return result;
}

export function collectUserText(transcript: CounselTranscript): string {
  const parts = (transcript.church ?? []).map((turn) => turn.answer);
  if (transcript.backyard) parts.push(transcript.backyard.text);
  return parts.join("\n");
}
