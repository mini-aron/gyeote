import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "곁에 - 말씀과 찬양 추천",
    short_name: "곁에",
    description: "짧게 이야기하면, 지금 마음에 꼭 맞는 말씀 한 구절과 찬양 한 곡",
    lang: "ko",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0d0b1a",
    theme_color: "#1d2350",
    related_applications: [
      {
        platform: "play",
        url: "https://play.google.com/store/apps/details?id=com.gyeote.app",
        id: "com.gyeote.app",
      },
    ],
    prefer_related_applications: true,
    categories: ["lifestyle", "books"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
