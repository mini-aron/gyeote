export function isShareCancel(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}
