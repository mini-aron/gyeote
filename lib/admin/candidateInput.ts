import { isUuid } from "@/shared/lib/uuid";
import type { CandidateStatus, CandidateTags, TagGroup } from "./types";

export const EDITABLE_STATUSES = ["new", "parsed", "tagged"] as const;
export type EditableStatus = (typeof EDITABLE_STATUSES)[number];

export const REJECTABLE_STATUSES = ["new", "needs_video", "parsed", "tagged", "duplicate"] as const;
export type RejectableStatus = (typeof REJECTABLE_STATUSES)[number];

export const REJECT_REASONS = [
  { key: "not_song", label: "곡이 아니에요" },
  { key: "medley", label: "메들리" },
  { key: "foreign", label: "외국곡" },
  { key: "duplicate", label: "중복" },
  { key: "other", label: "기타" },
] as const;

export const REJECT_REASON_LABELS: Record<string, string> = {
  ...Object.fromEntries(REJECT_REASONS.map((reason) => [reason.key, reason.label])),
  no_hangul: "한글 곡명 없음",
};

export const TAG_GROUPS: readonly TagGroup[] = ["themes", "situations", "moods"];
export const TAG_GROUP_LABELS: Record<TagGroup, string> = {
  themes: "주제",
  situations: "상황",
  moods: "분위기",
};

const MAX_TEXT_LENGTH = 200;
const MAX_MEMO_LENGTH = 1000;
export const MAX_TAGS_PER_GROUP = 10;

export const STATUS_LABELS: Record<CandidateStatus, string> = {
  new: "파싱 필요",
  needs_video: "영상 필요",
  parsed: "태그 필요",
  tagged: "승인 대기",
  approved: "승인됨",
  rejected: "거절됨",
  duplicate: "중복",
  unavailable: "재생 불가",
};

type Parsed<T> = { ok: true; value: T } | { ok: false; message: string };

const INVALID = { ok: false, message: "요청 형식이 올바르지 않아요." } as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function oneOf<T extends string>(value: unknown, allowed: readonly T[]): T | null {
  return allowed.find((item) => item === value) ?? null;
}

export function parseId(value: unknown): string | null {
  return isUuid(value) ? value : null;
}

export function hasRequiredTags(tags: CandidateTags): boolean {
  return tags.themes.length >= 1 && tags.moods.length >= 1;
}

export function emptyTags(): CandidateTags {
  return { themes: [], situations: [], moods: [] };
}

export function readSuggestedTags(value: unknown): CandidateTags {
  const tags = emptyTags();
  if (!isRecord(value)) return tags;
  for (const group of TAG_GROUPS) {
    const names = value[group];
    if (Array.isArray(names)) {
      tags[group] = names.filter((name): name is string => typeof name === "string");
    }
  }
  return tags;
}

function parseTags(value: unknown): CandidateTags | null {
  if (!isRecord(value)) return null;
  const tags = emptyTags();
  for (const group of TAG_GROUPS) {
    const names = value[group] ?? [];
    if (!Array.isArray(names) || names.length > MAX_TAGS_PER_GROUP) return null;
    if (names.some((name) => typeof name !== "string" || name.length === 0 || name.length > 50)) return null;
    tags[group] = [...new Set(names as string[])];
  }
  return tags;
}

export type SaveInput = {
  id: string;
  expectedStatus: EditableStatus;
  title: string;
  artist: string;
  tags: CandidateTags;
  memo: string | null;
};

export function parseSaveInput(raw: unknown): Parsed<SaveInput> {
  if (!isRecord(raw)) return INVALID;
  const id = parseId(raw.id);
  const expectedStatus = oneOf(raw.expectedStatus, EDITABLE_STATUSES);
  const tags = parseTags(raw.tags);
  if (!id || !expectedStatus || !tags) return INVALID;

  if (typeof raw.title !== "string" || typeof raw.artist !== "string") return INVALID;
  const title = raw.title.trim();
  const artist = raw.artist.trim();
  if (!title || title.length > MAX_TEXT_LENGTH) return { ok: false, message: "곡명을 1~200자로 입력해 주세요." };
  if (!artist || artist.length > MAX_TEXT_LENGTH) return { ok: false, message: "아티스트를 1~200자로 입력해 주세요." };

  const memoRaw = raw.memo ?? "";
  if (typeof memoRaw !== "string") return INVALID;
  const memo = memoRaw.trim();
  if (memo.length > MAX_MEMO_LENGTH) return { ok: false, message: "메모는 1000자까지 입력할 수 있어요." };

  return { ok: true, value: { id, expectedStatus, title, artist, tags, memo: memo || null } };
}

export type RejectInput = { id: string; expectedStatus: RejectableStatus; reason: string };

export function parseRejectInput(raw: unknown): Parsed<RejectInput> {
  if (!isRecord(raw)) return INVALID;
  const id = parseId(raw.id);
  const expectedStatus = oneOf(raw.expectedStatus, REJECTABLE_STATUSES);
  const reason = oneOf(raw.reason, REJECT_REASONS.map((item) => item.key));
  if (!id || !expectedStatus || !reason) return INVALID;
  return { ok: true, value: { id, expectedStatus, reason } };
}

export type PromoteAlternateInput = { currentId: string; alternateId: string };

export function parsePromoteAlternateInput(raw: unknown): Parsed<PromoteAlternateInput> {
  if (!isRecord(raw)) return INVALID;
  const currentId = parseId(raw.currentId);
  const alternateId = parseId(raw.alternateId);
  if (!currentId || !alternateId || currentId === alternateId) return INVALID;
  return { ok: true, value: { currentId, alternateId } };
}

export function parseLinkInput(raw: unknown): Parsed<{ candidateId: string; songId: string; replace: boolean }> {
  if (!isRecord(raw)) return INVALID;
  const candidateId = parseId(raw.candidateId);
  const songId = parseId(raw.songId);
  if (!candidateId || !songId || typeof raw.replace !== "boolean") return INVALID;
  return { ok: true, value: { candidateId, songId, replace: raw.replace } };
}

export function parseDistinctInput(raw: unknown): Parsed<{ candidateId: string; songId: string }> {
  if (!isRecord(raw)) return INVALID;
  const candidateId = parseId(raw.candidateId);
  const songId = parseId(raw.songId);
  if (!candidateId || !songId) return INVALID;
  return { ok: true, value: { candidateId, songId } };
}

export type ChannelKind = "artist" | "label" | "topic";
export const CHANNEL_KINDS: readonly ChannelKind[] = ["artist", "label", "topic"];
export const CHANNEL_KIND_LABELS: Record<ChannelKind, string> = {
  artist: "아티스트",
  label: "레이블",
  topic: "Topic",
};

export type AddChannelInput = { input: string; kind: ChannelKind; defaultArtist: string | null };

function parseDefaultArtist(value: unknown, kind: ChannelKind): Parsed<string | null> {
  if (kind === "topic") return { ok: true, value: null };
  const artist = typeof value === "string" ? value.trim() : "";
  if (artist.length > MAX_TEXT_LENGTH) return INVALID;
  if (kind === "artist" && !artist) return { ok: false, message: "아티스트 채널은 대표 아티스트명이 필요해요." };
  return { ok: true, value: artist || null };
}

export function parseAddChannelInput(raw: unknown): Parsed<AddChannelInput> {
  if (!isRecord(raw)) return INVALID;
  const kind = oneOf(raw.kind, CHANNEL_KINDS);
  if (!kind || typeof raw.input !== "string") return INVALID;
  const input = raw.input.trim();
  if (!input || input.length > MAX_TEXT_LENGTH) return { ok: false, message: "채널 주소나 @핸들을 입력해 주세요." };
  const defaultArtist = parseDefaultArtist(raw.defaultArtist, kind);
  if (!defaultArtist.ok) return defaultArtist;
  return { ok: true, value: { input, kind, defaultArtist: defaultArtist.value } };
}

export type UpdateChannelInput = {
  id: string;
  status: "tracking" | "ignored";
  kind: ChannelKind;
  defaultArtist: string | null;
};

export function parseUpdateChannelInput(raw: unknown): Parsed<UpdateChannelInput> {
  if (!isRecord(raw)) return INVALID;
  const id = parseId(raw.id);
  const status = oneOf(raw.status, ["tracking", "ignored"] as const);
  const kind = oneOf(raw.kind, CHANNEL_KINDS);
  if (!id || !status || !kind) return INVALID;
  const defaultArtist = parseDefaultArtist(raw.defaultArtist, kind);
  if (!defaultArtist.ok) return defaultArtist;
  return { ok: true, value: { id, status, kind, defaultArtist: defaultArtist.value } };
}

const MAX_URL_LENGTH = 300;

export type ManualInput = { title: string; artist: string; memo: string | null; url: string | null };

export function parseManualInput(raw: unknown): Parsed<ManualInput> {
  if (!isRecord(raw)) return INVALID;
  if (typeof raw.title !== "string" || typeof raw.artist !== "string") return INVALID;
  const title = raw.title.trim();
  const artist = raw.artist.trim();
  if (!title || title.length > MAX_TEXT_LENGTH) return { ok: false, message: "곡명을 1~200자로 입력해 주세요." };
  if (!artist || artist.length > MAX_TEXT_LENGTH) return { ok: false, message: "아티스트를 1~200자로 입력해 주세요." };

  const memoRaw = raw.memo ?? "";
  const urlRaw = raw.url ?? "";
  if (typeof memoRaw !== "string" || typeof urlRaw !== "string") return INVALID;
  const memo = memoRaw.trim();
  const url = urlRaw.trim();
  if (memo.length > MAX_MEMO_LENGTH) return { ok: false, message: "메모는 1000자까지 입력할 수 있어요." };
  if (url.length > MAX_URL_LENGTH) return { ok: false, message: "영상 주소가 너무 길어요." };
  return { ok: true, value: { title, artist, memo: memo || null, url: url || null } };
}

export function parseAttachInput(raw: unknown): Parsed<{ id: string; url: string }> {
  if (!isRecord(raw)) return INVALID;
  const id = parseId(raw.id);
  if (!id || typeof raw.url !== "string") return INVALID;
  const url = raw.url.trim();
  if (!url || url.length > MAX_URL_LENGTH) return { ok: false, message: "영상 주소를 입력해 주세요." };
  return { ok: true, value: { id, url } };
}
