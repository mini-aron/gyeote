import { useEffect, useRef, useState } from "react";

export type SpeechRecognitionStatus = "idle" | "listening" | "unsupported" | "error";

// lib.dom.d.ts에는 SpeechRecognitionResult/ResultList만 있고 SpeechRecognition
// 본체·이벤트 타입은 없어서 필요한 만큼만 직접 선언한다.
interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEventLike {
  error: string;
}

interface SpeechRecognitionLike extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

function getSpeechRecognitionConstructor(): SpeechRecognitionConstructor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/**
 * F-02 음성 입력(1안, Web Speech API). 명세에 이미 "카카오톡 인앱 브라우저·
 * iOS에서 불안정"이라고 나와 있어서, 지원하지 않는 브라우저에서는 그냥
 * status를 "unsupported"로 두고 호출부가 버튼을 숨겨 텍스트 입력으로
 * 자연스럽게 넘어가게 한다(F-02 예외처리) — 별도 폴리필/재시도는 하지 않는다.
 */
export function useSpeechRecognition(onFinalResult: (text: string) => void) {
  const [status, setStatus] = useState<SpeechRecognitionStatus>("idle");
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const onFinalResultRef = useRef(onFinalResult);
  const hasCheckedSupport = useRef(false);

  useEffect(() => {
    onFinalResultRef.current = onFinalResult;
  }, [onFinalResult]);

  useEffect(() => {
    // 지원 여부는 클라이언트에서만 판단 가능 — 서버 렌더와 다르면
    // 하이드레이션이 깨지므로 렌더 중이 아니라 effect에서 확인한다.
    if (hasCheckedSupport.current) return;
    hasCheckedSupport.current = true;
    setStatus(getSpeechRecognitionConstructor() === null ? "unsupported" : "idle");
  }, []);

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
    };
  }, []);

  function start() {
    const Recognition = getSpeechRecognitionConstructor();
    if (!Recognition) {
      setStatus("unsupported");
      return;
    }

    const recognition = new Recognition();
    recognition.lang = "ko-KR";
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.onresult = (event) => {
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        if (result.isFinal) {
          onFinalResultRef.current(result[0].transcript);
        }
      }
    };
    recognition.onerror = () => {
      setStatus("error");
    };
    recognition.onend = () => {
      setStatus((prev) => (prev === "listening" ? "idle" : prev));
    };

    recognitionRef.current = recognition;
    recognition.start();
    setStatus("listening");
  }

  function stop() {
    recognitionRef.current?.stop();
    setStatus("idle");
  }

  return { status, start, stop };
}
