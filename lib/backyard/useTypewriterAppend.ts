import { useEffect, useRef } from "react";

const TYPE_INTERVAL_MS = 30;

/**
 * 음성 인식으로 들어온 텍스트를 한 글자씩 순서대로 흘려 넣어 실시간으로
 * "토독토독" 타이핑되는 느낌을 준다. 직접 키보드로 치는 글자는 이미
 * 하나씩 쳐지므로 이 효과를 거치지 않는다 — 음성 결과 전용.
 */
export function useTypewriterAppend(onAppendChar: (char: string) => void) {
  const queueRef = useRef<string[]>([]);
  const timerRef = useRef<number | null>(null);
  const onAppendCharRef = useRef(onAppendChar);

  useEffect(() => {
    onAppendCharRef.current = onAppendChar;
  }, [onAppendChar]);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) window.clearInterval(timerRef.current);
    };
  }, []);

  return function enqueue(chunk: string) {
    queueRef.current.push(...chunk.split(""));
    if (timerRef.current !== null) return;

    timerRef.current = window.setInterval(() => {
      const next = queueRef.current.shift();
      if (next === undefined) {
        if (timerRef.current !== null) window.clearInterval(timerRef.current);
        timerRef.current = null;
        return;
      }
      onAppendCharRef.current(next);
    }, TYPE_INTERVAL_MS);
  };
}
