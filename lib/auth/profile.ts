import "server-only";
import type { User } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/shared/lib/supabase-client";

const MAX_NICKNAME_LENGTH = 20;
const DEFAULT_NICKNAME = "곁에 친구";
const NICKNAME_KEYS = ["name", "full_name", "nickname", "preferred_username", "user_name"];
const AVATAR_KEYS = ["avatar_url", "picture", "profile_image"];

function pickString(meta: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = meta[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

export async function ensureProfile(user: User): Promise<void> {
  const meta = user.user_metadata ?? {};
  const nickname = Array.from(pickString(meta, NICKNAME_KEYS) ?? DEFAULT_NICKNAME)
    .slice(0, MAX_NICKNAME_LENGTH)
    .join("");
  const avatarUrl = pickString(meta, AVATAR_KEYS);

  const { error } = await supabaseAdmin
    .from("profiles")
    .upsert(
      { user_id: user.id, nickname, avatar_url: avatarUrl },
      { onConflict: "user_id", ignoreDuplicates: true },
    );
  if (error) throw error;
}
