"use client";

import { useEffect, useRef, useState } from "react";
import { CHURCH_CONTINUATION_LINE, pickOpeningLine } from "@/lib/backyard/openingLines";
import { getDraft, saveDraft, clearDraft } from "@/lib/backyard/draft";
import { useSpeechRecognition } from "@/lib/backyard/useSpeechRecognition";
import { useTypewriterAppend } from "@/lib/backyard/useTypewriterAppend";
import { VoiceButton } from "./VoiceButton";

const MAX_LENGTH = 1000;
const SHORT_TEXT_THRESHOLD = 20;
const SHORT_TEXT_NUDGE = "조금 더 이야기해주실 수 있을까요? 편하게 이어서 쓰셔도 괜찮아요.";

export function BackyardInput({
  onFinish,
  hasChurchContext = false,
}: {
  onFinish: (text: string) => void;
  hasChurchContext?: boolean;
}) {
  const [openingLine, setOpeningLine] = useState("");
  const [text, setText] = useState("");
  const [nudge, setNudge] = useState<string | null>(null);
  const hasNudged = useRef(false);
  const hasInitialized = useRef(false);
  const hasQueuedVoiceText = useRef(false);

  useEffect(() => {
    // 여는 문구는 Math.random()으로 고르고 임시 저장 글은 localStorage를 읽는데,
    // 둘 다 서버와 클라이언트가 다른 값을 낼 수 있어 렌더 중이 아니라
    // effect에서 한 번만 계산한다 (하이드레이션 불일치 방지).
    if (hasInitialized.current) return;
    hasInitialized.current = true;
    setOpeningLine(pickOpeningLine());
    setText(getDraft());
  }, []);

  const enqueueTypedText = useTypewriterAppend((char) => {
    setText((prev) => {
      const next = `${prev}${char}`.slice(0, MAX_LENGTH);
      saveDraft(next);
      return next;
    });
  });

  const { status: voiceStatus, start: startVoice, stop: stopVoice } = useSpeechRecognition(
    (finalText) => {
      // 음성으로 들어온 문장은 즉시 붙이지 않고 한 글자씩 흘려 넣어
      // 실시간으로 타이핑되는 느낌을 준다.
      const needsSeparator = text.length > 0 || hasQueuedVoiceText.current;
      hasQueuedVoiceText.current = true;
      enqueueTypedText(needsSeparator ? ` ${finalText}` : finalText);
    },
  );

  function handleChange(event: React.ChangeEvent<HTMLTextAreaElement>) {
    const next = event.target.value.slice(0, MAX_LENGTH);
    setText(next);
    saveDraft(next);
  }

  function handleFinish() {
    const trimmed = text.trim();
    // F-02 규칙: 20자 미만이면 한 번만 더 물어보고, 그래도 짧으면 그대로 진행.
    // 교회 대화가 이어진 경우엔 이미 재료가 있어 다시 묻지 않는다.
    if (!hasChurchContext && trimmed.length < SHORT_TEXT_THRESHOLD && !hasNudged.current) {
      hasNudged.current = true;
      setNudge(SHORT_TEXT_NUDGE);
      return;
    }
    clearDraft();
    onFinish(trimmed);
  }

  return (
    <div className="pointer-events-none flex flex-1 flex-col justify-end px-4 pb-[calc(96px+env(safe-area-inset-bottom,0px))] pt-24">
      <div className="pointer-events-auto flex flex-col gap-4">
        <p className="max-w-[80%] self-start rounded-2xl bg-white/[0.08] px-4 py-2 text-sm leading-relaxed text-[#f4f1ff]">
          {nudge ?? (hasChurchContext ? CHURCH_CONTINUATION_LINE : openingLine)}
        </p>

        <div className="flex flex-col gap-2">
          <textarea
            value={text}
            onChange={handleChange}
            maxLength={MAX_LENGTH}
            rows={6}
            placeholder="편하게 적어보세요"
            className="w-full resize-none rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm leading-relaxed text-[#f4f1ff] placeholder:text-[#f4f1ff]/40 focus:outline-none"
          />
          <span className="self-end text-xs text-[#f4f1ff]/40">
            {text.length} / {MAX_LENGTH}
          </span>
        </div>

        <div className="flex flex-col items-center gap-2">
          <VoiceButton status={voiceStatus} onStart={startVoice} onStop={stopVoice} />
          {voiceStatus === "listening" && (
            <span className="text-xs text-[#f4f1ff]/50">듣고 있어요…</span>
          )}
          {voiceStatus === "error" && (
            <span className="text-xs text-[#f4f1ff]/50">
              마이크를 쓸 수 없어서 직접 입력으로 이어갈게요
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={handleFinish}
          className="self-center rounded-full border border-white/15 bg-white/[0.08] px-5 py-2 text-sm text-[#f4f1ff]/90 transition-colors hover:bg-white/[0.14]"
        >
          다 썼어요
        </button>
      </div>
    </div>
  );
}
