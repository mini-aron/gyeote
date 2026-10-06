"use client";

import { useState } from "react";
import { useLoginSheet } from "@/components/auth/LoginSheetContext";
import { getSupabaseBrowserClient } from "@/shared/lib/supabase-browser";
import { sanitizeNextPath } from "@/lib/auth/nextPath";

export function LoginSheet() {
  const { state, close } = useLoginSheet();
  const [starting, setStarting] = useState(false);
  const [failed, setFailed] = useState(false);

  if (!state) return null;

  const handleKakao = async () => {
    setStarting(true);
    setFailed(false);
    const next = sanitizeNextPath(state.next);
    const { error } = await getSupabaseBrowserClient().auth.signInWithOAuth({
      provider: "kakao",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    if (error) {
      setStarting(false);
      setFailed(true);
    }
  };

  return (
    <div className="pointer-events-none fixed inset-0 z-50 flex flex-col justify-end">
      <div
        aria-hidden="true"
        onClick={close}
        className="pointer-events-auto absolute inset-0 bg-black/50"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="로그인"
        className="pointer-events-auto relative mx-auto flex w-full max-w-md flex-col gap-4 rounded-t-3xl border border-white/10 bg-[#14102a]/95 px-6 pb-[calc(24px+env(safe-area-inset-bottom,0px))] pt-6 text-[#f4f1ff] backdrop-blur-xl"
      >
        <div className="flex flex-col gap-2 text-center">
          <p className="text-base font-medium">
            카카오로 로그인하면 받은 말씀과 찬양을 모아둘 수 있어요
          </p>
          <p className="text-xs text-[#f4f1ff]/60">로그인하면 대화가 내 기록으로 저장돼요</p>
        </div>

        {failed && (
          <p className="text-center text-sm text-[#ffb4b4]">
            로그인을 시작하지 못했어요. 잠시 후 다시 시도해 주세요.
          </p>
        )}

        <div className="flex flex-col gap-2">
          <button
            type="button"
            disabled={starting}
            onClick={handleKakao}
            className="rounded-xl bg-[#FEE500] px-4 py-3 text-sm font-medium text-black disabled:opacity-60"
          >
            카카오로 시작하기
          </button>
          <button
            type="button"
            onClick={close}
            className="rounded-xl px-4 py-2 text-sm text-[#f4f1ff]/60"
          >
            다음에 할게요
          </button>
        </div>
      </div>
    </div>
  );
}
