"use client";

import { useEffect } from "react";

export function PwaSetup() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      if (process.env.NODE_ENV === "production") {
        navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch(() => {
          // 등록 실패해도 웹 사용에는 지장이 없다
        });
      } else {
        // 같은 포트에서 next start 후 next dev를 띄우면 옛 SW가 dev 청크를 가로챈다
        navigator.serviceWorker
          .getRegistrations()
          .then((registrations) => registrations.forEach((registration) => registration.unregister()))
          .catch(() => {});
      }
    }

    // 안드로이드는 Play 스토어 앱으로만 안내하므로 크롬 자체 설치 안내를 숨긴다
    function handleBeforeInstallPrompt(event: Event) {
      event.preventDefault();
    }
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
  }, []);

  return null;
}
