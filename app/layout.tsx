import type { Metadata } from "next";
import { Noto_Sans_KR, Gowun_Batang } from "next/font/google";
import "./globals.css";

const notoSansKr = Noto_Sans_KR({
  variable: "--font-sans-kr",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

const gowunBatang = Gowun_Batang({
  variable: "--font-serif-kr",
  subsets: ["latin"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: "곁에 · gyeote",
  description:
    "예수님과 짧게 대화하면, 지금 마음에 꼭 맞는 말씀 한 구절과 찬양 한 곡을 골라주는 웹서비스",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ko"
      className={`${notoSansKr.variable} ${gowunBatang.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
