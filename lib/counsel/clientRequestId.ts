// crypto.randomUUID는 http(비보안 컨텍스트)에서 없을 수 있다 — 없으면 저장만 포기한다.
export function createClientRequestId(): string | undefined {
  try {
    return crypto.randomUUID();
  } catch {
    return undefined;
  }
}
