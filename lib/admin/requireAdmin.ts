import "server-only";
import { cache } from "react";
import { notFound } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { getCurrentUser } from "@/shared/lib/auth";
import { supabaseAdmin } from "@/shared/lib/supabase-client";

const isAdmin = cache(async (userId: string): Promise<boolean> => {
  const { data, error } = await supabaseAdmin
    .from("admins")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(`admins 조회 실패: ${error.message}`);
  return data !== null;
});

// 관리자 화면의 존재 자체를 숨기려고 비로그인·일반 회원 모두 404로 처리한다
export async function requireAdmin(): Promise<User> {
  const user = await getCurrentUser();
  if (!user || !(await isAdmin(user.id))) notFound();
  return user;
}
