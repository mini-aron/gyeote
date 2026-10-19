"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { supabaseAdmin } from "@/shared/lib/supabase-client";
import { isUuid } from "@/shared/lib/uuid";
import type { AdminActionResult } from "@/lib/admin/types";

const GENERIC_FAILURE = "처리하지 못했어요. 잠시 후 다시 시도해 주세요.";
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function addLyricsViewer(email: unknown): Promise<AdminActionResult> {
  const admin = await requireAdmin();
  if (typeof email !== "string" || email.length > 254 || !EMAIL_PATTERN.test(email.trim())) {
    return { ok: false, message: "이메일 형식을 확인해 주세요." };
  }

  const { data: userId, error } = await supabaseAdmin.rpc("find_user_id_by_email", { p_email: email.trim() });
  if (error) return { ok: false, message: GENERIC_FAILURE };
  if (!userId) return { ok: false, message: "이 이메일로 가입한 회원이 없어요." };

  const { error: insertError } = await supabaseAdmin
    .from("lyrics_viewers")
    .upsert({ user_id: userId, granted_by: admin.id }, { onConflict: "user_id", ignoreDuplicates: true });
  if (insertError) return { ok: false, message: GENERIC_FAILURE };
  revalidatePath("/admin/lyrics");
  return { ok: true, message: "가사 열람자로 지정했어요." };
}

export async function removeLyricsViewer(userId: unknown): Promise<AdminActionResult> {
  await requireAdmin();
  if (!isUuid(userId)) return { ok: false, message: "잘못된 요청이에요." };

  const { error } = await supabaseAdmin.from("lyrics_viewers").delete().eq("user_id", userId);
  if (error) return { ok: false, message: GENERIC_FAILURE };
  revalidatePath("/admin/lyrics");
  return { ok: true };
}
