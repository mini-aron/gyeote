import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 기본 위치(bottom-left)가 하단 메뉴바 홈 버튼과 겹쳐 드래그 중 releasePointerCapture 예외가 난다
  devIndicators: { position: "top-right" },
  experimental: { staleTimes: { dynamic: 60 } },
  // 런타임에 readFile로 읽는 폰트·배경은 서버리스 번들에 자동 포함되지 않는다
  outputFileTracingIncludes: {
    "/api/share-card": [
      "./node_modules/@fontsource/gowun-batang/*.css",
      "./node_modules/@fontsource/gowun-batang/files/*.woff",
      "./public/share/*.jpg",
    ],
  },
  outputFileTracingExcludes: {
    "/api/share-card": ["./node_modules/@fontsource/**/*.woff2"],
  },
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
        ],
      },
    ];
  },
};

export default nextConfig;
