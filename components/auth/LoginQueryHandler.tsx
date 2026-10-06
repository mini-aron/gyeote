"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useLoginSheet } from "@/components/auth/LoginSheetContext";

export function LoginQueryHandler() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const { open } = useLoginSheet();
  const handledLogin = useRef<string | null>(null);

  const login = searchParams.get("login");
  const hasLoginError = searchParams.get("loginError") !== null;
  const deleted = searchParams.get("deleted") === "1";

  useEffect(() => {
    if (!login || handledLogin.current === login) return;
    // Strict Mode 이중 실행 방지
    handledLogin.current = login;
    if (/^[a-z0-9/-]+$/i.test(login)) open({ next: `/${login}`, reason: login });
    router.replace(pathname, { scroll: false });
  }, [login, open, pathname, router]);

  useEffect(() => {
    if (!hasLoginError) return;
    const timer = setTimeout(() => router.replace(pathname, { scroll: false }), 5000);
    return () => clearTimeout(timer);
  }, [hasLoginError, pathname, router]);

  useEffect(() => {
    if (!deleted) return;
    const timer = setTimeout(() => router.replace(pathname, { scroll: false }), 5000);
    return () => clearTimeout(timer);
  }, [deleted, pathname, router]);

  if (!hasLoginError && !deleted) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 top-[calc(16px+env(safe-area-inset-top,0px))] z-40 flex justify-center px-6">
      <p className="pointer-events-auto rounded-xl border border-white/10 bg-[#14102a]/90 px-4 py-2 text-sm text-[#f4f1ff]">
        {deleted ? "탈퇴가 완료됐어요" : "로그인하지 못했어요. 다시 시도해 주세요."}
      </p>
    </div>
  );
}
