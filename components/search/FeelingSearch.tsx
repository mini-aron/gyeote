"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { GLASS_CARD } from "@/components/glassCard";
import { searchByFeeling } from "@/lib/search/actions";
import { MAX_FEELING_LENGTH } from "@/lib/search/feelingTags";
import type { SearchType } from "@/lib/search/searchQuery";

const ERROR_MESSAGE = {
  invalid: "두 글자 이상 적어주세요.",
  failed: "지금은 마음을 읽지 못했어요. 아래에서 주제나 키워드로 찾아봐 주세요.",
} as const;

export function FeelingSearch({ type, onCrisis }: { type: SearchType; onCrisis: () => void }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [error, setError] = useState<keyof typeof ERROR_MESSAGE | null>(null);
  const [pending, startTransition] = useTransition();

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`${GLASS_CARD} px-4 py-3 text-left text-sm text-[#f4f1ff]/85`}
      >
        지금 마음으로 찾기
        <span className="mt-0.5 block text-xs text-[#f4f1ff]/50">마음을 적으면 어울리는 {type === "verse" ? "말씀" : "찬양"}을 찾아드려요</span>
      </button>
    );
  }

  const submit = () => {
    setError(null);
    startTransition(async () => {
      try {
        const result = await searchByFeeling(text, type);
        if (result.ok) {
          setText("");
          setOpen(false);
          router.push(result.href, { scroll: false });
          return;
        }
        if (result.error === "crisis") onCrisis();
        // 세션이 끊겼거나 동의가 빠졌으면 페이지를 다시 그려 requireMember가 안내 화면으로 보내게 한다.
        else if (result.error === "unauthorized" || result.error === "consent") router.refresh();
        else setError(result.error);
      } catch {
        setError("failed");
      }
    });
  };

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
      className={`${GLASS_CARD} flex flex-col gap-3 px-4 py-4`}
    >
      <label htmlFor="feeling" className="text-sm text-[#f4f1ff]/85">
        지금 마음이 어떠세요?
      </label>
      <textarea
        id="feeling"
        value={text}
        onChange={(event) => setText(event.target.value)}
        maxLength={MAX_FEELING_LENGTH}
        rows={3}
        autoFocus
        disabled={pending}
        placeholder="예: 요즘 일이 많아서 지치고 마음이 불안해요"
        className="resize-none rounded-xl border border-white/10 bg-white/[0.08] px-3 py-2 text-sm text-[#f4f1ff] outline-none placeholder:text-[#f4f1ff]/40 focus:border-white/30 disabled:opacity-60"
      />
      {error && (
        <p role="alert" className="text-xs text-[#f4f1ff]/70">
          {ERROR_MESSAGE[error]}
          {error === "failed" && (
            // 문구는 전문가 검토 전 임시안 — AI가 위기 문장에 JSON 대신 안전 응답을 줘서 실패로 빠지는 경우를 대비한다
            <span className="mt-1 block text-[#f4f1ff]/55">
              마음이 많이 힘드시면 언제든 <a href="tel:109" className="underline underline-offset-2">109</a>(자살예방상담전화, 24시간)에 전화할 수 있어요.
            </span>
          )}
        </p>
      )}
      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setError(null);
          }}
          disabled={pending}
          className="px-3 py-2 text-xs text-[#f4f1ff]/60"
        >
          닫기
        </button>
        <button
          type="submit"
          disabled={pending || text.trim().length < 2}
          className="rounded-xl border border-white/10 bg-white/15 px-4 py-2 text-sm text-[#f4f1ff] disabled:opacity-50"
        >
          {pending ? "마음을 읽는 중..." : "찾기"}
        </button>
      </div>
    </form>
  );
}
