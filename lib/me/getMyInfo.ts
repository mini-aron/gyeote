import "server-only";
import type { User } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/shared/lib/supabase-server";
import { ensureProfile } from "@/lib/auth/profile";
import type { ConsentType } from "@/lib/auth/consents";
import type { ConsentHistoryEntry, MyInfo } from "@/lib/me/types";

async function selectProfile(userId: string) {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("profiles")
    .select("nickname, avatar_url, keep_history")
    .eq("user_id", userId)
    .maybeSingle();
  return data;
}

export async function getMyInfo(user: User): Promise<MyInfo> {
  let profile = await selectProfile(user.id);
  if (!profile) {
    await ensureProfile(user);
    profile = await selectProfile(user.id);
  }

  const supabase = await createSupabaseServerClient();
  const { data: rows } = await supabase
    .from("user_consents")
    .select("consent_type, version, agreed, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const latest = new Map<string, ConsentHistoryEntry>();
  for (const row of rows ?? []) {
    if (latest.has(row.consent_type)) continue;
    latest.set(row.consent_type, {
      type: row.consent_type as ConsentType,
      agreed: row.agreed,
      version: row.version,
      createdAt: row.created_at,
    });
  }

  return {
    nickname: profile?.nickname ?? "곁에 친구",
    avatarUrl: profile?.avatar_url ?? null,
    keepHistory: profile?.keep_history ?? true,
    consents: [...latest.values()],
  };
}
