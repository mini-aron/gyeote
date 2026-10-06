"use server";

import { revalidatePath } from "next/cache";
import type { User } from "@supabase/supabase-js";
import { getCurrentUser } from "@/shared/lib/auth";
import { createSupabaseServerClient } from "@/shared/lib/supabase-server";
import { supabaseAdmin } from "@/shared/lib/supabase-client";
import { hasRequiredConsents } from "@/lib/auth/consentStatus";
import { CONSENT_VERSION } from "@/lib/auth/consents";
import { ensureProfile } from "@/lib/auth/profile";
import type { MeActionResult } from "@/lib/me/types";

const DELETE_CONFIRM_TEXT = "탈퇴";
const KAKAO_UNLINK_TIMEOUT_MS = 5000;

const UNAUTHORIZED: MeActionResult = { ok: false, error: "unauthorized" };
const FAILED: MeActionResult = { ok: false, error: "failed" };

async function getConsentedUser(): Promise<User | null> {
  const user = await getCurrentUser();
  if (!user || !(await hasRequiredConsents(user.id))) return null;
  return user;
}

export async function updateKeepHistory(enabled: boolean): Promise<MeActionResult> {
  if (typeof enabled !== "boolean") return { ok: false, error: "invalid" };
  const user = await getConsentedUser();
  if (!user) return UNAUTHORIZED;
  try {
    await ensureProfile(user);
    const { error } = await supabaseAdmin
      .from("profiles")
      .update({ keep_history: enabled, updated_at: new Date().toISOString() })
      .eq("user_id", user.id);
    if (error) return FAILED;
  } catch {
    return FAILED;
  }
  revalidatePath("/me");
  return { ok: true };
}

export async function updateMarketingConsent(agreed: boolean): Promise<MeActionResult> {
  if (typeof agreed !== "boolean") return { ok: false, error: "invalid" };
  const user = await getConsentedUser();
  if (!user) return UNAUTHORIZED;
  const { error } = await supabaseAdmin.from("user_consents").insert({
    user_id: user.id,
    consent_type: "marketing",
    version: CONSENT_VERSION,
    agreed,
  });
  if (error) return FAILED;
  revalidatePath("/me");
  return { ok: true };
}

export async function deleteAllCounselRecords(): Promise<MeActionResult> {
  const user = await getConsentedUser();
  if (!user) return UNAUTHORIZED;
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("counsel_records").delete().eq("user_id", user.id);
  if (error) return FAILED;
  revalidatePath("/calendar");
  revalidatePath("/calendar/[date]", "page");
  return { ok: true };
}

// 카카오 Admin Key unlink 형식 — 실제 호출 검증 전 임시안
async function unlinkKakao(user: User): Promise<void> {
  const adminKey = process.env.KAKAO_ADMIN_KEY;
  const kakaoId = user.identities?.find((identity) => identity.provider === "kakao")?.id;
  if (!adminKey || !kakaoId) {
    console.warn("kakao unlink skipped:", !adminKey ? "no admin key" : "no kakao identity");
    return;
  }
  try {
    const response = await fetch("https://kapi.kakao.com/v1/user/unlink", {
      method: "POST",
      headers: {
        Authorization: `KakaoAK ${adminKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ target_id_type: "user_id", target_id: kakaoId }),
      signal: AbortSignal.timeout(KAKAO_UNLINK_TIMEOUT_MS),
    });
    if (!response.ok) console.warn("kakao unlink failed:", response.status);
  } catch (error) {
    console.warn("kakao unlink error:", error instanceof Error ? error.name : "unknown");
  }
}

export async function deleteAccount(confirmText: string): Promise<MeActionResult> {
  if (confirmText !== DELETE_CONFIRM_TEXT) return { ok: false, error: "invalid" };
  const user = await getCurrentUser();
  if (!user) return UNAUTHORIZED;

  await unlinkKakao(user);

  const { error } = await supabaseAdmin.auth.admin.deleteUser(user.id);
  if (error) return FAILED;

  try {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut({ scope: "local" });
  } catch {
    // 계정은 이미 삭제됐고 남은 쿠키는 다음 요청에서 무효 처리된다
  }
  return { ok: true };
}
