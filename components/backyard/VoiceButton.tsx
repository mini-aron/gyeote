"use client";

import type { SpeechRecognitionStatus } from "@/lib/backyard/useSpeechRecognition";

export function VoiceButton({
  status,
  onStart,
  onStop,
}: {
  status: SpeechRecognitionStatus;
  onStart: () => void;
  onStop: () => void;
}) {
  // 미지원 브라우저에서는 버튼 자체를 숨겨 텍스트 입력으로 자연스럽게 넘어가게 한다.
  if (status === "unsupported") return null;

  const isListening = status === "listening";

  return (
    <button
      type="button"
      onClick={isListening ? onStop : onStart}
      aria-pressed={isListening}
      aria-label={isListening ? "음성 입력 멈추기" : "음성으로 말하기"}
      className={`flex h-14 w-14 items-center justify-center rounded-full border transition-colors ${
        isListening
          ? "animate-pulse border-[#ffd9a8]/40 bg-[#ffd9a8]/20 text-[#ffd9a8]"
          : "border-white/15 bg-white/[0.06] text-[#f4f1ff]/80 hover:bg-white/[0.1]"
      }`}
    >
      <MicIcon />
    </button>
  );
}

function MicIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="22"
      height="22"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="9" y="2" width="6" height="12" rx="3" />
      <path d="M5 10v1a7 7 0 0 0 14 0v-1" />
      <line x1="12" y1="18" x2="12" y2="22" />
      <line x1="8" y1="22" x2="16" y2="22" />
    </svg>
  );
}
