import type { Metadata, Viewport } from "next";
import { WorldProvider } from "@/lib/world/WorldContext";
import { LazyWorldBackground } from "@/components/world/LazyWorldBackground";
import { LoginSheetProvider } from "@/components/auth/LoginSheetContext";
import { LoginSheet } from "@/components/auth/LoginSheet";
import { BottomNavProvider } from "@/components/nav/BottomNavContext";
import { BottomNav } from "@/components/nav/BottomNav";
import { PwaSetup } from "@/components/pwa/PwaSetup";
// next/font/google는 빌드 중 Google Fonts를 직접 fetch하는데, Turbopack의
// 폰트 리졸버가 이 과정에서 가끔 "Can't resolve
// '@vercel/turbopack-next/internal/font/google/font'" 에러를 내며 Vercel
// 빌드를 깨뜨린다(알려진 Turbopack 이슈). 빌드 타임 네트워크 의존을 아예
// 없애기 위해 폰트를 npm 패키지(@fontsource)로 직접 번들한다.
import "@fontsource/noto-sans-kr/400.css";
import "@fontsource/noto-sans-kr/500.css";
import "@fontsource/noto-sans-kr/700.css";
import "@fontsource/gowun-batang/400.css";
import "@fontsource/gowun-batang/700.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "곁에 · gyeote",
  description:
    "짧게 대화하면, 지금 마음에 꼭 맞는 말씀 한 구절과 찬양 한 곡을 골라주는 웹서비스",
  appleWebApp: { capable: true, title: "곁에", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  themeColor: "#1d2350",
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans">
        <WorldProvider>
          <LoginSheetProvider>
            <BottomNavProvider>
              <LazyWorldBackground />
              {/* Keeps overlay text legible regardless of how bright the 3D scene is behind it. */}
              <div
                aria-hidden="true"
                className="pointer-events-none fixed inset-x-0 bottom-0 z-[5] h-[62%] bg-gradient-to-t from-[#0a0816]/90 via-[#0a0816]/50 to-transparent"
              />
              <div className="pointer-events-none relative z-10 flex min-h-dvh flex-1 flex-col">
                {children}
              </div>
              <BottomNav />
              <LoginSheet />
              <PwaSetup />
            </BottomNavProvider>
          </LoginSheetProvider>
        </WorldProvider>
      </body>
    </html>
  );
}
