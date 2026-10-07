const DISMISSED_AT_KEY = "gyeote:installPromptDismissedAt";
const TWA_SESSION_KEY = "gyeote:isTwa";
const DISMISS_DURATION_MS = 14 * 24 * 60 * 60 * 1000;
const PLAY_PACKAGE = "com.gyeote.app";
// Play 출시 후 true로 바꾼다
const PLAY_STORE_RELEASED = false;

export type InstallGuide = "playStore" | "iosSafari" | "openInSafari";

const listeners = new Set<() => void>();

export function subscribeInstallGuide(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function isInsideTwa() {
  try {
    if (document.referrer.startsWith(`android-app://${PLAY_PACKAGE}`)) {
      // 앱 안에서 카카오 로그인처럼 문서를 다시 불러오면 referrer가 사라지므로 탭 단위로 기억해 둔다
      window.sessionStorage.setItem(TWA_SESSION_KEY, "1");
      return true;
    }
    return window.sessionStorage.getItem(TWA_SESSION_KEY) === "1";
  } catch {
    // 저장소가 막혀 있으면 referrer 판정만으로 충분히 대부분을 거른다
    return false;
  }
}

function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches || isInsideTwa();
}

function wasDismissedRecently(now: Date) {
  try {
    const raw = window.localStorage.getItem(DISMISSED_AT_KEY);
    if (!raw) return false;
    return now.getTime() - new Date(raw).getTime() < DISMISS_DURATION_MS;
  } catch {
    // 저장소 접근이 막힌 환경 — 안내를 한 번 더 보여주는 쪽이 낫다
    return false;
  }
}

function isIos(userAgent: string) {
  return /iPhone|iPad|iPod/.test(userAgent) || (/Macintosh/.test(userAgent) && navigator.maxTouchPoints > 1);
}

function isRealSafari(userAgent: string) {
  return /Safari/.test(userAgent) && !/CriOS|FxiOS|EdgiOS|KAKAOTALK|NAVER|Instagram|FBAN|FBAV|Line\/|GSA\/|DaumApps|BAND\/|Whale\/|Ddg\//i.test(userAgent);
}

export function getInstallGuide(): InstallGuide | null {
  if (isStandalone() || wasDismissedRecently(new Date())) return null;

  const userAgent = navigator.userAgent;
  if (/Android/.test(userAgent)) return PLAY_STORE_RELEASED ? "playStore" : null;

  if (isIos(userAgent)) {
    if (/KAKAOTALK/i.test(userAgent)) return "openInSafari";
    return isRealSafari(userAgent) ? "iosSafari" : null;
  }
  return null;
}

export function dismissInstallGuide(now: Date) {
  try {
    window.localStorage.setItem(DISMISSED_AT_KEY, now.toISOString());
  } catch {
    // 저장 실패 시 다음 방문에 다시 보일 뿐이라 무시
  }
  listeners.forEach((listener) => listener());
}

export function buildPlayStoreUrl() {
  // 카카오톡 인앱 웹뷰는 https Play 링크를 안에서 열어버린다
  if (/KAKAOTALK/i.test(navigator.userAgent)) return `market://details?id=${PLAY_PACKAGE}`;
  return `https://play.google.com/store/apps/details?id=${PLAY_PACKAGE}`;
}

export function buildOpenInSafariUrl() {
  // 결과 화면 상태는 메모리에만 있어서 외부 브라우저에서는 홈으로 연다
  return `kakaotalk://web/openExternal?url=${encodeURIComponent(`${window.location.origin}/`)}`;
}
