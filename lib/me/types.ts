import type { ConsentType } from "@/lib/auth/consents";

export type MeActionResult = { ok: true } | { ok: false; error: string };

export interface ConsentHistoryEntry {
  type: ConsentType;
  agreed: boolean;
  version: string;
  createdAt: string;
}

export interface MyInfo {
  nickname: string;
  avatarUrl: string | null;
  keepHistory: boolean;
  consents: ConsentHistoryEntry[];
}
