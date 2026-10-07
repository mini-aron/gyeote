"use client";

import { useEffect, useState, useTransition } from "react";
import { useWorld } from "@/lib/world/WorldContext";
import { GLASS_CARD } from "@/components/glassCard";
import { CONSENT_ITEMS, type ConsentType } from "@/lib/auth/consents";
import { useBottomNavHidden } from "@/components/nav/BottomNavContext";
import { getSupabaseBrowserClient } from "@/shared/lib/supabase-browser";
import { cancelSignup, submitConsents } from "@/app/welcome/actions";

export function ConsentForm({ next }: { next: string }) {
  const { flyTo } = useWorld();
  useBottomNavHidden(true);
  const [checked, setChecked] = useState<Record<ConsentType, boolean>>({
    terms: false,
    privacy: false,
    sensitive: false,
    age14: false,
    marketing: false,
  });
  const [opened, setOpened] = useState<ConsentType | null>(null);
  const [pending, startTransition] = useTransition();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    flyTo("sky");
  }, [flyTo]);

  const allChecked = CONSENT_ITEMS.every((item) => checked[item.type]);
  const requiredChecked = CONSENT_ITEMS.filter((item) => item.required).every(
    (item) => checked[item.type],
  );

  const toggleAll = () => {
    const value = !allChecked;
    setChecked({ terms: value, privacy: value, sensitive: value, age14: value, marketing: value });
  };

  const handleSubmit = () => {
    setFailed(false);
    startTransition(async () => {
      try {
        await submitConsents({ consents: checked, next });
      } catch {
        setFailed(true);
      }
    });
  };

  const handleCancel = () => {
    startTransition(async () => {
      try {
        await cancelSignup();
      } catch {
        // 서버 쿠키 정리가 실패해도 브라우저 세션은 아래에서 끊는다
      }
      await getSupabaseBrowserClient().auth.signOut({ scope: "local" });
      window.location.replace("/");
    });
  };

  return (
    <main className="pointer-events-none flex min-h-dvh flex-1 flex-col items-center justify-center px-6 py-12 text-[#f4f1ff]">
      <div className={`${GLASS_CARD} pointer-events-auto flex w-full max-w-sm flex-col gap-5 p-5`}>
        <div className="flex flex-col gap-1">
          <h1 className="font-serif-kr text-xl font-semibold">곁에 시작하기</h1>
          <p className="text-sm text-[#f4f1ff]/70">
            서비스를 이용하려면 아래 항목에 동의해 주세요.
          </p>
        </div>

        <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-white/10 bg-white/[0.06] px-4 py-3">
          <input
            type="checkbox"
            checked={allChecked}
            onChange={toggleAll}
            className="h-4 w-4 accent-[#FEE500]"
          />
          <span className="text-sm font-medium">전체 동의</span>
        </label>

        <ul className="flex flex-col gap-3">
          {CONSENT_ITEMS.map((item) => (
            <li key={item.type} className="flex flex-col gap-2">
              <div className="flex items-center gap-3">
                <input
                  id={`consent-${item.type}`}
                  type="checkbox"
                  checked={checked[item.type]}
                  onChange={(event) =>
                    setChecked((prev) => ({ ...prev, [item.type]: event.target.checked }))
                  }
                  className="h-4 w-4 shrink-0 accent-[#FEE500]"
                />
                <label htmlFor={`consent-${item.type}`} className="flex-1 text-sm">
                  {item.label}
                </label>
                <button
                  type="button"
                  onClick={() => setOpened((prev) => (prev === item.type ? null : item.type))}
                  className="shrink-0 text-xs text-[#f4f1ff]/60 underline underline-offset-2"
                >
                  {opened === item.type ? "닫기" : "보기"}
                </button>
              </div>
              {opened === item.type && (
                <div className="flex flex-col gap-1.5 rounded-xl bg-black/20 px-4 py-3 text-xs leading-relaxed text-[#f4f1ff]/70">
                  {item.body.map((line) => (
                    <p key={line}>{line}</p>
                  ))}
                </div>
              )}
            </li>
          ))}
        </ul>

        {failed && (
          <p className="text-sm text-[#ffb4b4]">저장하지 못했어요. 잠시 후 다시 시도해 주세요.</p>
        )}

        <div className="flex flex-col gap-2">
          <button
            type="button"
            disabled={!requiredChecked || pending}
            onClick={handleSubmit}
            className="rounded-xl bg-[#f4f1ff] px-4 py-3 text-sm font-medium text-[#1a1530] transition-opacity disabled:opacity-40"
          >
            시작하기
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={handleCancel}
            className="rounded-xl px-4 py-2 text-sm text-[#f4f1ff]/60 disabled:opacity-40"
          >
            취소
          </button>
        </div>
      </div>
    </main>
  );
}
