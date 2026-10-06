import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 기본 위치(bottom-left)가 하단 메뉴바 홈 버튼과 겹쳐 드래그 중 releasePointerCapture 예외가 난다
  devIndicators: { position: "top-right" },
};

export default nextConfig;
