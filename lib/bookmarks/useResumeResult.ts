"use client";

import { useEffect, useRef } from "react";
import { ensureSongBookmark, ensureVerseBookmark } from "@/lib/bookmarks/actions";
import {
  parseResumeParam,
  takePendingResult,
  type PendingResult,
  type ResultMode,
} from "@/lib/bookmarks/pendingResult";

interface ResumeHandlers {
  onStart: () => void;
  onRestore: (pending: PendingResult) => void;
}

export function useResumeResult(mode: ResultMode, handlers: ResumeHandlers) {
  const hasResumed = useRef(false);
  const handlersRef = useRef(handlers);

  useEffect(() => {
    handlersRef.current = handlers;
  });

  useEffect(() => {
    if (hasResumed.current) return;
    hasResumed.current = true;

    const resume = parseResumeParam(new URLSearchParams(window.location.search).get("resume"));
    const pending = takePendingResult(mode);
    if (window.location.search) window.history.replaceState(null, "", window.location.pathname);
    if (!pending) return;

    handlersRef.current.onStart();
    const run = async () => {
      const target = pending[resume?.kind ?? "verse"];
      if (resume && target?.id === resume.id) {
        try {
          await (resume.kind === "verse" ? ensureVerseBookmark(resume.id) : ensureSongBookmark(resume.id));
        } catch {
          // 북마크 저장은 부가 동작 — 실패해도 결과 화면은 그대로 보여준다
        }
      }
      handlersRef.current.onRestore(pending);
    };
    void run();
  }, [mode]);
}
