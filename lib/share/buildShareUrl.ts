import type { MoodKey } from "@/lib/world/moods";

// 카드 이미지 URL의 정규형: verse, mood, song(있을 때) 순서·소문자 id. 라우트가 이 형태가 아니면 리다이렉트한다.
export function buildShareCardPath(verseId: string, songId: string | null, mood: MoodKey): string {
  const params = new URLSearchParams({ verse: verseId.toLowerCase(), mood });
  if (songId) params.set("song", songId.toLowerCase());
  return `/api/share-card?${params.toString()}`;
}

export function buildShareUrl(
  origin: string,
  verseId: string,
  songId: string | null,
  mood: MoodKey,
): string {
  const params = new URLSearchParams();
  if (songId) params.set("song", songId.toLowerCase());
  params.set("mood", mood);
  return `${origin}/share/${encodeURIComponent(verseId.toLowerCase())}?${params.toString()}`;
}
