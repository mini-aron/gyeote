const CHANNEL_ID = /^UC[\w-]{22}$/;
const HANDLE = /^@[\p{L}\p{N}._-]{3,30}$/u;
const VIDEO_ID = /^[\w-]{11}$/;
const YOUTUBE_HOSTS = new Set(["youtube.com", "www.youtube.com", "m.youtube.com", "music.youtube.com"]);
const VIDEO_PATH_PREFIXES = new Set(["shorts", "embed", "live", "v"]);

export type ChannelRef = { kind: "id" | "handle"; value: string };

function toUrl(input: string): URL | null {
  const withScheme = /^https?:\/\//i.test(input) ? input : `https://${input}`;
  try {
    return new URL(withScheme);
  } catch {
    return null;
  }
}

function safeDecode(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

export function parseChannelInput(raw: string): ChannelRef | null {
  const input = raw.trim();
  if (CHANNEL_ID.test(input)) return { kind: "id", value: input };
  if (HANDLE.test(input)) return { kind: "handle", value: input };

  const url = toUrl(input);
  if (!url || !YOUTUBE_HOSTS.has(url.hostname.toLowerCase())) return null;
  const [first, second] = url.pathname.split("/").filter(Boolean).map(safeDecode);
  if (first === "channel" && second && CHANNEL_ID.test(second)) return { kind: "id", value: second };
  if (first && HANDLE.test(first)) return { kind: "handle", value: first };
  return null;
}

export function parseVideoInput(raw: string): string | null {
  const input = raw.trim();
  if (VIDEO_ID.test(input)) return input;

  const url = toUrl(input);
  if (!url) return null;
  const host = url.hostname.toLowerCase();
  const segments = url.pathname.split("/").filter(Boolean);

  if (host === "youtu.be") return segments[0] && VIDEO_ID.test(segments[0]) ? segments[0] : null;
  if (!YOUTUBE_HOSTS.has(host)) return null;

  const watchId = url.searchParams.get("v");
  if (segments[0] === "watch" && watchId && VIDEO_ID.test(watchId)) return watchId;
  if (segments[0] && VIDEO_PATH_PREFIXES.has(segments[0]) && segments[1] && VIDEO_ID.test(segments[1])) {
    return segments[1];
  }
  return null;
}
