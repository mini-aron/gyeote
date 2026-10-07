// 대화·추천은 온라인 전용이라 오프라인 기능은 만들지 않는다.
// 해시가 붙은 정적 자산만 캐시하고, API·RSC·Server Action·Supabase 요청은 가로채지 않는다(회원 데이터가 기기 캐시에 남지 않게).
const CACHE_VERSION = "v1";
const STATIC_CACHE = `gyeote-static-${CACHE_VERSION}`;
const OFFLINE_CACHE = `gyeote-offline-${CACHE_VERSION}`;
const OFFLINE_URL = "/offline.html";
const STATIC_CACHE_MAX_ENTRIES = 200;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(OFFLINE_CACHE)
      .then((cache) => cache.add(new Request(OFFLINE_URL, { cache: "reload" })))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  const keep = new Set([STATIC_CACHE, OFFLINE_CACHE]);
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => !keep.has(key)).map((key) => caches.delete(key))))
      .then(() => self.registration.navigationPreload?.enable().catch(() => {}))
      .then(() => self.clients.claim()),
  );
});

function isStaticAsset(url) {
  return url.pathname.startsWith("/_next/static/");
}

async function trimStaticCache(cache) {
  const keys = await cache.keys();
  // 배포마다 해시 파일이 쌓이므로 오래된 것부터 지운다 (cache.keys()는 넣은 순서)
  await Promise.all(keys.slice(0, Math.max(0, keys.length - STATIC_CACHE_MAX_ENTRIES)).map((key) => cache.delete(key)));
}

async function cacheFirst(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  // 캡티브 포털 리다이렉트·opaque 응답이 청크 URL로 굳지 않게 한다
  if (response.ok && !response.redirected && response.type === "basic") {
    // 용량 초과 등으로 쓰기가 실패해도 이미 받은 응답은 그대로 돌려준다
    cache.put(request, response.clone()).then(() => trimStaticCache(cache)).catch(() => {});
  }
  return response;
}

async function networkWithOfflineFallback(event) {
  try {
    return (await event.preloadResponse) ?? (await fetch(event.request));
  } catch {
    const cache = await caches.open(OFFLINE_CACHE);
    return (await cache.match(OFFLINE_URL)) ?? Response.error();
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(networkWithOfflineFallback(event));
    return;
  }

  if (isStaticAsset(url)) {
    event.respondWith(cacheFirst(request));
  }
});
