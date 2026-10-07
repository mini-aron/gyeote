"use client";

import { useSyncExternalStore } from "react";
import { GLASS_CARD } from "@/components/glassCard";
import {
  buildOpenInSafariUrl,
  buildPlayStoreUrl,
  dismissInstallGuide,
  getInstallGuide,
  subscribeInstallGuide,
} from "@/lib/pwa/installPrompt";

const ACTION_CLASS = "shrink-0 rounded-full bg-[#ffd9a8] px-3 py-1.5 text-xs font-medium text-[#14102a]";

function ShareIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="mx-1 inline-block align-[-2px]"
    >
      <path d="M12 15V3M8 7l4-4 4 4M6 11H5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1h-1" />
    </svg>
  );
}

export function InstallBanner() {
  // localStorage·UA는 서버 렌더와 달라서, 서버 스냅샷(null)으로 하이드레이션한 뒤 클라이언트 값으로 바뀐다
  const guide = useSyncExternalStore(subscribeInstallGuide, getInstallGuide, () => null);
  if (!guide) return null;

  return (
    <div className={`${GLASS_CARD} flex items-center gap-3 px-4 py-3 text-[#f4f1ff]`}>
      <span aria-hidden="true" className="h-7 w-5 shrink-0 rounded-t-full bg-[#ffc27a] shadow-[0_0_16px_rgba(255,194,122,0.5)]" />
      <p className="flex-1 text-[13px] leading-snug text-[#f4f1ff]/85">
        {guide === "playStore" && "곁에 앱으로 매일 들러보세요"}
        {guide === "iosSafari" && (
          <>
            Safari 공유 메뉴
            <ShareIcon />
            에서 &lsquo;홈 화면에 추가&rsquo;를 누르면 곁에를 둘 수 있어요
          </>
        )}
        {guide === "openInSafari" && "Safari에서 열면 곁에를 홈 화면에 둘 수 있어요"}
      </p>
      {guide === "playStore" && (
        <a href={buildPlayStoreUrl()} className={ACTION_CLASS}>
          Play 스토어에서 받기
        </a>
      )}
      {guide === "openInSafari" && (
        <a href={buildOpenInSafariUrl()} className={ACTION_CLASS}>
          브라우저에서 열기
        </a>
      )}
      <button
        type="button"
        onClick={() => dismissInstallGuide(new Date())}
        aria-label="설치 안내 닫기"
        className="shrink-0 p-1 text-[#f4f1ff]/50 hover:text-[#f4f1ff]"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <path d="M6 6l12 12M18 6 6 18" />
        </svg>
      </button>
    </div>
  );
}
