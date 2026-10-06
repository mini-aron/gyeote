"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { GLASS_CARD } from "@/components/glassCard";
import { useWorld } from "@/lib/world/WorldContext";
import { CONSENT_ITEMS, CONSENT_VERSION, type ConsentType } from "@/lib/auth/consents";
import { formatKstDate } from "@/lib/calendar/dateUtils";
import { getSupabaseBrowserClient } from "@/shared/lib/supabase-browser";
import {
  deleteAccount,
  deleteAllCounselRecords,
  updateKeepHistory,
  updateMarketingConsent,
} from "@/lib/me/actions";
import type { MeActionResult, MyInfo } from "@/lib/me/types";

const DELETE_CONFIRM_TEXT = "탈퇴";
const DEFAULT_ERROR = "처리하지 못했어요. 잠시 후 다시 시도해 주세요.";

function Toggle({
  checked,
  disabled,
  label,
  onChange,
}: {
  checked: boolean;
  disabled: boolean;
  label: string;
  onChange: (next: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative h-7 w-12 shrink-0 rounded-full transition-colors disabled:opacity-50 ${
        checked ? "bg-[#c9bcff]" : "bg-white/20"
      }`}
    >
      <span
        className={`absolute top-1 left-1 h-5 w-5 rounded-full bg-[#1a1530] transition-transform ${
          checked ? "translate-x-5" : ""
        }`}
      />
    </button>
  );
}

export function MeView({ info }: { info: MyInfo }) {
  const { flyTo } = useWorld();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [keepHistory, setKeepHistory] = useState(info.keepHistory);
  const [consents, setConsents] = useState(info.consents);
  const [opened, setOpened] = useState<ConsentType | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [deleteText, setDeleteText] = useState("");
  const [showDelete, setShowDelete] = useState(false);

  useEffect(() => {
    flyTo("sky");
  }, [flyTo]);

  const marketing = consents.find((entry) => entry.type === "marketing");
  const marketingAgreed = marketing?.agreed ?? false;

  const run = (task: () => Promise<MeActionResult>, onOk: () => void) => {
    setError(null);
    startTransition(async () => {
      try {
        const result = await task();
        if (result.ok) onOk();
        else setError(DEFAULT_ERROR);
      } catch {
        setError(DEFAULT_ERROR);
      }
    });
  };

  const handleKeepHistory = (next: boolean) => {
    run(
      () => updateKeepHistory(next),
      () => {
        setKeepHistory(next);
        setNotice(
          next
            ? "앞으로의 대화도 기록으로 남겨요."
            : "앞으로의 대화 원문은 저장하지 않고 받은 말씀·찬양만 남아요.",
        );
      },
    );
  };

  const handleMarketing = (next: boolean) => {
    run(
      () => updateMarketingConsent(next),
      () => {
        const now = new Date().toISOString();
        setConsents((prev) => [
          ...prev.filter((entry) => entry.type !== "marketing"),
          { type: "marketing", agreed: next, version: CONSENT_VERSION, createdAt: now },
        ]);
        setNotice(
          `${formatKstDate(now)}에 수신 ${next ? "동의했어요" : "동의를 철회했어요"}.`,
        );
      },
    );
  };

  const handleClear = () => {
    run(deleteAllCounselRecords, () => {
      setConfirmClear(false);
      setNotice("상담 기록을 모두 삭제했어요.");
    });
  };

  const handleSignOut = () => {
    startTransition(async () => {
      await getSupabaseBrowserClient().auth.signOut({ scope: "local" });
      router.replace("/");
      router.refresh();
    });
  };

  const handleDelete = () => {
    setError(null);
    startTransition(async () => {
      try {
        const result = await deleteAccount(deleteText);
        if (!result.ok) {
          setError(DEFAULT_ERROR);
          return;
        }
        await getSupabaseBrowserClient().auth.signOut({ scope: "local" });
        router.replace("/?deleted=1");
        router.refresh();
      } catch {
        setError(DEFAULT_ERROR);
      }
    });
  };

  const section = "flex flex-col gap-3 border-t border-white/10 pt-4";
  const subtle = "text-xs leading-relaxed text-[#f4f1ff]/60";
  const outlineButton =
    "rounded-xl border border-white/15 px-4 py-2.5 text-sm disabled:opacity-40";

  return (
    <main className="pointer-events-none flex min-h-dvh flex-1 flex-col justify-end px-4 pb-[calc(96px+env(safe-area-inset-bottom,0px))] pt-16 text-[#f4f1ff]">
      <div
        className={`${GLASS_CARD} pointer-events-auto mx-auto flex max-h-[calc(100dvh-10rem)] w-full max-w-md flex-col gap-4 overflow-y-auto px-5 py-5`}
      >
        <div className="flex items-center gap-3">
          <div
            className="h-12 w-12 shrink-0 rounded-full bg-white/15 bg-cover bg-center"
            style={info.avatarUrl ? { backgroundImage: `url("${info.avatarUrl}")` } : undefined}
            aria-hidden="true"
          />
          <div className="min-w-0">
            <p className={subtle}>내정보</p>
            <h1 className="truncate font-serif-kr text-xl font-semibold">{info.nickname}</h1>
          </div>
        </div>

        {(notice || error) && (
          <p
            role="status"
            className={`rounded-xl px-4 py-2.5 text-sm ${
              error ? "bg-[#ffb4b4]/15 text-[#ffb4b4]" : "bg-white/10"
            }`}
          >
            {error ?? notice}
          </p>
        )}

        <section className={section}>
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-sm font-medium">대화 기록 남기기</h2>
            <Toggle
              checked={keepHistory}
              disabled={pending}
              label="대화 기록 남기기"
              onChange={handleKeepHistory}
            />
          </div>
          <p className={subtle}>
            {keepHistory
              ? "대화 내용과 받은 말씀·찬양을 캘린더에서 다시 볼 수 있어요."
              : "앞으로의 대화 원문은 저장하지 않고 받은 말씀·찬양만 남아요."}
          </p>
        </section>

        <section className={section}>
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-sm font-medium">마케팅 · 홍보 정보 수신</h2>
            <Toggle
              checked={marketingAgreed}
              disabled={pending}
              label="마케팅 · 홍보 정보 수신"
              onChange={handleMarketing}
            />
          </div>
        </section>

        <section className={section}>
          <h2 className="text-sm font-medium">동의 내역</h2>
          <ul className="flex flex-col gap-3">
            {CONSENT_ITEMS.map((item) => {
              const entry = consents.find((consent) => consent.type === item.type);
              return (
                <li key={item.type} className="flex flex-col gap-2">
                  <div className="flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm">{item.label}</p>
                      <p className={subtle}>
                        {entry
                          ? `${entry.agreed ? "동의" : "철회"} · ${formatKstDate(entry.createdAt)} · ${entry.version}`
                          : "동의 이력 없음"}
                      </p>
                    </div>
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
              );
            })}
          </ul>
        </section>

        <section className={section}>
          <h2 className="text-sm font-medium">상담 기록 전체 삭제</h2>
          <p className={subtle}>저장된 상담 기록(대화 원문 포함)을 모두 지워요. 되돌릴 수 없어요.</p>
          {confirmClear ? (
            <div className="flex gap-2">
              <button
                type="button"
                disabled={pending}
                onClick={handleClear}
                className="flex-1 rounded-xl bg-[#ffb4b4] px-4 py-2.5 text-sm font-medium text-[#1a1530] disabled:opacity-40"
              >
                정말 삭제할게요
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => setConfirmClear(false)}
                className={`${outlineButton} flex-1`}
              >
                취소
              </button>
            </div>
          ) : (
            <button
              type="button"
              disabled={pending}
              onClick={() => setConfirmClear(true)}
              className={outlineButton}
            >
              기록 전체 삭제
            </button>
          )}
        </section>

        <section className={section}>
          <button type="button" disabled={pending} onClick={handleSignOut} className={outlineButton}>
            로그아웃
          </button>
        </section>

        <section className={section}>
          <h2 className="text-sm font-medium text-[#ffb4b4]">회원 탈퇴</h2>
          <p className={subtle}>
            탈퇴하면 상담 기록·대화 원문·북마크·일정·동의 이력이 즉시 삭제되고 되돌릴 수 없어요.
          </p>
          {showDelete ? (
            <div className="flex flex-col gap-2">
              <label htmlFor="delete-confirm" className={subtle}>
                계속하려면 “{DELETE_CONFIRM_TEXT}”를 입력해 주세요.
              </label>
              <input
                id="delete-confirm"
                value={deleteText}
                onChange={(event) => setDeleteText(event.target.value)}
                autoComplete="off"
                className="rounded-xl border border-white/15 bg-black/20 px-4 py-2.5 text-sm outline-none"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={pending || deleteText !== DELETE_CONFIRM_TEXT}
                  onClick={handleDelete}
                  className="flex-1 rounded-xl bg-[#ffb4b4] px-4 py-2.5 text-sm font-medium text-[#1a1530] disabled:opacity-40"
                >
                  탈퇴하기
                </button>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => {
                    setShowDelete(false);
                    setDeleteText("");
                  }}
                  className={`${outlineButton} flex-1`}
                >
                  취소
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              disabled={pending}
              onClick={() => setShowDelete(true)}
              className={`${outlineButton} text-[#ffb4b4]`}
            >
              회원 탈퇴
            </button>
          )}
        </section>
      </div>
    </main>
  );
}
