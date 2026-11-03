"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useBottomNavHidden } from "@/components/nav/BottomNavContext";
import type { SongResult, VerseResult } from "@/lib/recommend/types";
import { buildShareText } from "@/lib/share/buildShareText";
import { buildShareUrl } from "@/lib/share/buildShareUrl";
import { isShareCancel } from "@/lib/share/isShareCancel";
import { listShareOptions, type ShareOption } from "@/lib/share/listShareOptions";
import { useShareCard, type ShareCardStatus } from "./useShareCard";

const SHARE_BUTTON_CLASS =
  "inline-flex items-center gap-1.5 rounded-full border border-[#ffd9a8]/30 bg-[#ffd9a8]/15 px-3 py-2 font-medium text-[#ffd9a8] transition-colors hover:bg-[#ffd9a8]/25 disabled:opacity-40";
const COPIED_NOTICE_MS = 2000;

const ICON_PROPS = {
  width: 14,
  height: 14,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
} as const;

const ROW_ICON_PROPS = { ...ICON_PROPS, width: 20, height: 20, strokeWidth: 1.7 } as const;

function ShareIcon({ size = "button" }: { size?: "button" | "row" }) {
  return (
    <svg {...(size === "row" ? ROW_ICON_PROPS : ICON_PROPS)}>
      <path d="M12 15V3.5M7.5 8 12 3.5 16.5 8" />
      <path d="M8 11H6.5A1.5 1.5 0 0 0 5 12.5v7A1.5 1.5 0 0 0 6.5 21h11a1.5 1.5 0 0 0 1.5-1.5v-7a1.5 1.5 0 0 0-1.5-1.5H16" />
    </svg>
  );
}

const OPTION_ICONS: Record<ShareOption, ReactNode> = {
  image: (
    <svg {...ROW_ICON_PROPS}>
      <rect x="4" y="4" width="16" height="16" rx="2.5" />
      <circle cx="9" cy="9.5" r="1.5" />
      <path d="m20 15-4.5-4.5L6 20" />
    </svg>
  ),
  link: <ShareIcon size="row" />,
  copy: (
    <svg {...ROW_ICON_PROPS}>
      <path d="M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1 1" />
      <path d="M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1-1" />
    </svg>
  ),
  save: (
    <svg {...ROW_ICON_PROPS}>
      <path d="M12 4v11M7.5 10.5 12 15l4.5-4.5M5 19.5h14" />
    </svg>
  ),
};

const OPTION_LABELS: Record<ShareOption, { title: string; hint: string }> = {
  image: { title: "이미지로 공유", hint: "인스타 스토리·카톡에 카드 그대로" },
  link: { title: "링크로 공유", hint: "받은 사람도 같은 말씀과 찬양을 볼 수 있어요" },
  copy: { title: "링크 복사", hint: "원하는 곳에 붙여넣기" },
  save: { title: "이미지 저장", hint: "카드를 기기에 내려받기" },
};

interface ShareButtonProps {
  verse: VerseResult | null;
  song: SongResult | null;
}

export function ShareButton({ verse, song }: ShareButtonProps) {
  const { mood, status, file, previewUrl } = useShareCard(verse?.id, song?.id);
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={!verse || !mood}
        className={SHARE_BUTTON_CLASS}
      >
        <ShareIcon />
        공유하기
      </button>
      {open && verse && mood && (
        <ShareSheet
          verse={verse}
          song={song}
          url={buildShareUrl(window.location.origin, verse.id, song?.id ?? null, mood)}
          status={status}
          file={file}
          previewUrl={previewUrl}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

function ShareSheet({
  verse,
  song,
  url,
  status,
  file,
  previewUrl,
  onClose,
}: {
  verse: VerseResult;
  song: SongResult | null;
  url: string;
  status: ShareCardStatus;
  file: File | null;
  previewUrl: string | null;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const copiedTimer = useRef<number | undefined>(undefined);
  const text = buildShareText(verse, song);
  useBottomNavHidden(true);
  const options = listShareOptions({
    hasShare: typeof navigator.share === "function",
    canShareFile: Boolean(file && navigator.canShare?.({ files: [file] })),
    hasFile: Boolean(file),
  });

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => {
      window.removeEventListener("keydown", handleKey);
      window.clearTimeout(copiedTimer.current);
    };
  }, [onClose]);

  function copyLink() {
    navigator.clipboard.writeText(`${text}\n${url}`).then(() => {
      setCopied(true);
      window.clearTimeout(copiedTimer.current);
      copiedTimer.current = window.setTimeout(() => setCopied(false), COPIED_NOTICE_MS);
    }, () => {});
  }

  // iOS Safari는 사용자 제스처 직후 동기 호출에서만 공유 시트를 허용하므로 share 전에 await하지 않는다.
  function share(data: ShareData) {
    navigator.share(data).then(onClose, (error: unknown) => {
      if (isShareCancel(error)) return;
      console.error("share failed", error);
      copyLink();
    });
  }

  function saveImage() {
    if (!file || !previewUrl) return;
    const anchor = document.createElement("a");
    anchor.href = previewUrl;
    anchor.download = file.name;
    anchor.click();
  }

  function handleOption(option: ShareOption) {
    if (option === "image" && file) share({ files: [file], text, url });
    else if (option === "link") share({ text, url });
    else if (option === "copy") copyLink();
    else if (option === "save") saveImage();
  }

  // 결과 화면의 backdrop-blur 조상이 fixed의 기준 박스가 되어 시트가 화면 전체를 덮지 못하므로 body로 띄운다
  return createPortal(
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div aria-hidden="true" onClick={onClose} className="absolute inset-0 bg-[#0a0816]/70 backdrop-blur-sm" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="공유하기"
        className="relative mx-auto flex w-full max-w-md flex-col rounded-t-[28px] border border-b-0 border-white/10 bg-[#14102a] px-5 pb-[calc(16px+env(safe-area-inset-bottom,0px))] pt-3 text-[#f4f1ff] shadow-[0_-12px_40px_rgba(10,8,22,0.6)]"
      >
        <div aria-hidden="true" className="mx-auto mb-4 h-1 w-10 rounded-full bg-white/20" />

        <div className="flex items-center gap-4 px-1 pb-4">
          <div className="aspect-[9/16] w-14 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-white/[0.06] shadow-[0_4px_16px_rgba(10,8,22,0.5)]">
            {previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- 메모리의 blob URL이라 next/image 최적화 대상이 아니다
              <img src={previewUrl} alt="공유될 말씀 카드" className="size-full object-cover" />
            ) : (
              <div className="flex size-full items-center justify-center text-[9px] text-[#f4f1ff]/50">
                {status === "error" ? "카드 없음" : "만드는 중"}
              </div>
            )}
          </div>
          <div className="flex min-w-0 flex-col gap-0.5">
            <p className="font-serif-kr text-[17px] font-semibold">말씀 카드 공유</p>
            <p className="truncate text-xs text-[#f4f1ff]/60">
              {verse.reference}
              {song && <span className="text-[#c9bcff]/80"> · {song.title}</span>}
            </p>
          </div>
        </div>

        <ul className="flex flex-col divide-y divide-white/[0.06] border-y border-white/[0.06]">
          {options.map((option) => (
            <li key={option}>
              <button
                type="button"
                onClick={() => handleOption(option)}
                className="flex w-full items-center gap-3.5 px-1 py-3 text-left transition-colors active:bg-white/[0.04]"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#ffd9a8]/[0.12] text-[#ffd9a8]">
                  {OPTION_ICONS[option]}
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="text-sm font-medium">
                    {option === "copy" && copied ? "링크를 복사했어요" : OPTION_LABELS[option].title}
                  </span>
                  <span className="truncate text-xs text-[#f4f1ff]/45">{OPTION_LABELS[option].hint}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>

        <button
          type="button"
          onClick={onClose}
          className="mt-4 rounded-2xl bg-white/[0.06] px-4 py-3 text-sm text-[#f4f1ff]/70 transition-colors hover:bg-white/[0.1]"
        >
          닫기
        </button>
      </div>
    </div>,
    document.body,
  );
}
