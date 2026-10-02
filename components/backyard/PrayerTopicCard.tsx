"use client";

import { useState } from "react";

type Status = "loading" | "done" | "error";

export function PrayerTopicCard({
  status,
  topics,
  onRetry,
}: {
  status: Status;
  topics: string[];
  onRetry: () => void;
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(topics.map((topic) => `- ${topic}`).join("\n"));
      setCopied(true);
    } catch {
      // 클립보드 접근 실패 — 텍스트는 화면에 그대로 있으니 직접 복사할 수 있다
    }
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.05] px-5 py-4">
      <p className="text-xs tracking-wide text-[#f4f1ff]/50">기도제목</p>

      {status === "loading" && (
        <p className="mt-2 text-sm text-[#f4f1ff]/60">정리하고 있어요…</p>
      )}

      {status === "error" && (
        <div className="mt-2 flex items-center justify-between gap-3">
          <p className="text-sm text-[#f4f1ff]/60">지금은 정리하기 어려워요.</p>
          <button type="button" onClick={onRetry} className="shrink-0 text-xs text-[#f4f1ff]/80 underline">
            다시 시도
          </button>
        </div>
      )}

      {status === "done" && (
        <>
          <ul className="mt-2 flex flex-col gap-1.5 text-sm leading-relaxed text-[#f4f1ff]">
            {topics.map((topic) => (
              <li key={topic}>· {topic}</li>
            ))}
          </ul>
          <button
            type="button"
            onClick={handleCopy}
            className="mt-3 rounded-xl border border-white/10 bg-white/[0.08] px-3 py-2 text-xs text-[#f4f1ff]/80"
          >
            {copied ? "복사했어요" : "복사하기"}
          </button>
        </>
      )}
    </div>
  );
}
