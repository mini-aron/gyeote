// 서버에 요청 시간 제한이 없고 로컬 Ollama는 콜드 스타트에 수십 초가 걸리므로, 정상 지연보다 넉넉하게 잡는다.
export const REQUEST_TIMEOUT_MS = {
  question: 45_000,
  analyze: 60_000,
  prayerTopic: 60_000,
  recommend: 90_000,
} as const;

interface RequestJsonOptions {
  timeoutMs: number;
  signal?: AbortSignal;
}

export async function requestJson<T>(url: string, body: unknown, { timeoutMs, signal }: RequestJsonOptions): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const forwardAbort = () => controller.abort();
  if (signal?.aborted) controller.abort();
  else signal?.addEventListener("abort", forwardAbort, { once: true });

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!response.ok) throw new Error("request_failed");
    return (await response.json()) as T;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", forwardAbort);
  }
}
