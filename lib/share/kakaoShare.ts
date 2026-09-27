// 카카오 JS SDK는 공식 타입 패키지가 없어서 여기서 쓰는 만큼만 선언한다.
declare global {
  interface Window {
    Kakao?: {
      isInitialized: () => boolean;
      init: (jsKey: string) => void;
      Share: {
        sendDefault: (options: {
          objectType: "text";
          text: string;
          link: { mobileWebUrl: string; webUrl: string };
        }) => void;
      };
    };
  }
}

const KAKAO_SDK_URL = "https://developers.kakao.com/sdk/js/kakao.js";

// 빌드 타임에 인라인되는 값이라 서버/클라이언트가 항상 같다 — 하이드레이션 걱정 없음.
export const isKakaoConfigured = Boolean(process.env.NEXT_PUBLIC_KAKAO_JS_KEY);

let sdkLoadPromise: Promise<void> | null = null;

function loadKakaoSdk(): Promise<void> {
  if (window.Kakao) return Promise.resolve();
  if (sdkLoadPromise) return sdkLoadPromise;

  sdkLoadPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = KAKAO_SDK_URL;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("카카오 SDK 로드 실패"));
    document.head.appendChild(script);
  });

  return sdkLoadPromise;
}

/**
 * F-09 카카오톡 공유. 카카오 디벨로퍼스에서 발급한 JavaScript 키가
 * .env.local/Vercel의 NEXT_PUBLIC_KAKAO_JS_KEY에 있어야 동작한다 — 없으면
 * 호출부가 버튼 자체를 숨기도록 isKakaoConfigured를 같이 내보낸다.
 */
export async function shareToKakao(text: string, url: string): Promise<boolean> {
  const jsKey = process.env.NEXT_PUBLIC_KAKAO_JS_KEY;
  if (!jsKey) return false;

  try {
    await loadKakaoSdk();
    if (!window.Kakao) return false;
    if (!window.Kakao.isInitialized()) {
      window.Kakao.init(jsKey);
    }
    window.Kakao.Share.sendDefault({
      objectType: "text",
      text,
      link: { mobileWebUrl: url, webUrl: url },
    });
    return true;
  } catch {
    return false;
  }
}
