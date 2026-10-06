"use server";

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/shared/lib/auth";
import { createSupabaseServerClient } from "@/shared/lib/supabase-server";
import { supabaseAdmin } from "@/shared/lib/supabase-client";
import { CONSENT_ITEMS, CONSENT_VERSION, type ConsentType } from "@/lib/auth/consents";
import { sanitizeNextPath } from "@/lib/auth/nextPath";

export async function submitConsents(input: { consents: Record<ConsentType, boolean>; next: string }) {
  const user = await getCurrentUser();
  if (!user) redirect("/");

  const agreed = input.consents;
  if (typeof agreed !== "object" || agreed === null) throw new Error("consent_invalid");
  const requiredAgreed = CONSENT_ITEMS.filter((item) => item.required).every(
    (item) => agreed[item.type] === true,
  );
  if (!requiredAgreed) throw new Error("consent_required_missing");

  const rows = CONSENT_ITEMS.map((item) => ({
    user_id: user.id,
    consent_type: item.type,
    version: CONSENT_VERSION,
    agreed: agreed[item.type] === true,
  }));
  const { error } = await supabaseAdmin.from("user_consents").insert(rows);
  if (error) throw new Error("consent_insert_failed");

  redirect(sanitizeNextPath(input.next));
}

export async function cancelSignup(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut({ scope: "local" });
}
