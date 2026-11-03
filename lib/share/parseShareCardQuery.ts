import { buildShareCardPath } from "@/lib/share/buildShareUrl";
import { isMoodKey } from "@/lib/share/parseMood";
import { isUuid } from "@/shared/lib/uuid";
import type { MoodKey } from "@/lib/world/moods";

export type ShareCardQuery =
  | { valid: false }
  | {
      valid: true;
      verseId: string;
      songId: string | null;
      mood: MoodKey;
      canonicalPath: string;
      isCanonical: boolean;
    };

// search는 "?" 없는 쿼리 문자열 원문 — 정규형과 한 글자라도 다르면 isCanonical이 false다.
export function parseShareCardQuery(search: string): ShareCardQuery {
  const params = new URLSearchParams(search);
  const verse = params.get("verse");
  const song = params.get("song");
  const mood = params.get("mood");
  if (!isUuid(verse) || !isMoodKey(mood) || (song !== null && !isUuid(song))) return { valid: false };

  const verseId = verse.toLowerCase();
  const songId = song ? song.toLowerCase() : null;
  const canonicalPath = buildShareCardPath(verseId, songId, mood);
  return {
    valid: true,
    verseId,
    songId,
    mood,
    canonicalPath,
    isCanonical: canonicalPath === `/api/share-card?${search.replace(/^\?/, "")}`,
  };
}
