const CONTROL_OR_BACKSLASH = /[\x00-\x1f\x7f\\]/;
const PROBE_ORIGIN = "http://x";

export function sanitizeNextPath(raw: string | null | undefined): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return "/";
  if (CONTROL_OR_BACKSLASH.test(raw)) return "/";
  try {
    const url = new URL(raw, PROBE_ORIGIN);
    if (url.origin !== PROBE_ORIGIN) return "/";
    return url.pathname + url.search + url.hash;
  } catch {
    return "/";
  }
}
