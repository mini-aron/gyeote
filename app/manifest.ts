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
        url: "https://play.google.com/store/apps/details?id=site.gyeote.app",
        id: "site.gyeote.app",
      },
    ],
    prefer_related_applications: true,
    categories: ["lifestyle", "books"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    // 홈 화면 아이콘을 길게 누르면 뜨는 메뉴 — Play 앱(TWA)도 이 목록으로 바로가기를 만든다
    shortcuts: [
      { name: "캘린더", url: "/calendar", icons: shortcutIcons("calendar") },
      { name: "북마크", url: "/bookmarks", icons: shortcutIcons("bookmarks") },
      { name: "검색", url: "/search", icons: shortcutIcons("search") },
    ],
  };
}

// 글리프가 가운데 절반 안에 있어서 같은 파일을 원형으로 잘라도(maskable) 안 잘린다
function shortcutIcons(name: string) {
  const src = `/icons/shortcuts/${name}.png`;
  return [
    { src, sizes: "192x192", type: "image/png", purpose: "any" as const },
    { src, sizes: "192x192", type: "image/png", purpose: "maskable" as const },
  ];
}
