import "server-only";
import { cache } from "react";
import { createSupabaseServerClient } from "@/shared/lib/supabase-server";
import { CONSENT_VERSION, REQUIRED_CONSENT_TYPES } from "@/lib/auth/consents";

export const hasRequiredConsents = cache(async (userId: string): Promise<boolean> => {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("user_consents")
    .select("consent_type, version, agreed, created_at")
    .eq("user_id", userId)
    .in("consent_type", [...REQUIRED_CONSENT_TYPES])
    .order("created_at", { ascending: false });
  if (error || !data) return false;

  const latest = new Map<string, { version: string; agreed: boolean }>();
  for (const row of data) {
    if (!latest.has(row.consent_type)) latest.set(row.consent_type, row);
  }
  return REQUIRED_CONSENT_TYPES.every((type) => {
    const row = latest.get(type);
    return row?.version === CONSENT_VERSION && row.agreed;
  });
});
