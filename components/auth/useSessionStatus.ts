"use client";

import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/shared/lib/supabase-browser";

export type SessionStatus = "unknown" | "guest" | "member";

// UI 힌트 전용 — 권한 판단은 서버(getUser)에서만 한다.
export function useSessionStatus(): SessionStatus {
  const [status, setStatus] = useState<SessionStatus>("unknown");

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    let active = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (active) setStatus(data.session ? "member" : "guest");
    });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setStatus(session ? "member" : "guest");
    });
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);

  return status;
}
