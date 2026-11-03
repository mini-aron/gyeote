import { createElement } from "react";
import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { getShareContent } from "@/lib/share/getShareContent";
import { loadShareFonts, removeUnrenderableChars } from "@/lib/share/loadShareFonts";
import { fitSongLine } from "@/lib/share/fitVerseText";
import { parseShareCardQuery } from "@/lib/share/parseShareCardQuery";
import {
  SHARE_CARD_HEIGHT,
  SHARE_CARD_WIDTH,
  SHARE_DOMAIN,
  SHARE_WORDMARK,
  SHARE_WORDMARK_LATIN,
  ShareCard,
} from "@/components/share/ShareCard";
import type { MoodKey } from "@/lib/world/moods";

const CACHE_CONTROL = "public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400";
const NOT_FOUND_CACHE_CONTROL = "public, s-maxage=300";

function notFound() {
  return new Response("Not Found", { status: 404, headers: { "Cache-Control": NOT_FOUND_CACHE_CONTROL } });
}

async function readBackground(mood: MoodKey): Promise<string | null> {
  try {
    const file = await readFile(path.join(process.cwd(), "public", "share", `bg-${mood}.jpg`));
    return `data:image/jpeg;base64,${file.toString("base64")}`;
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = parseShareCardQuery(url.search);
  if (!query.valid) return notFound();
  if (!query.isCanonical) {
    return new Response(null, {
      status: 308,
      headers: { Location: query.canonicalPath, "Cache-Control": CACHE_CONTROL },
    });
  }

  const content = await getShareContent(query.verseId, query.songId);
  if (!content || (query.songId && !content.song)) return notFound();

  const { mood } = query;
  const [reference, translation, body, songTitle, songArtist] = await Promise.all([
    removeUnrenderableChars(content.verse.reference),
    removeUnrenderableChars(content.verse.translation),
    removeUnrenderableChars(content.verse.body),
    content.song ? removeUnrenderableChars(content.song.title) : "",
    content.song ? removeUnrenderableChars(content.song.artist) : "",
  ]);
  const verse = { reference, translation, body };
  const song = content.song ? { title: songTitle, artist: songArtist } : null;

  const [background, { fonts, fontFamily, boldFontFamily }] = await Promise.all([
    readBackground(mood),
    loadShareFonts({
      400: [
        body,
        reference,
        translation,
        song ? fitSongLine(song.title, song.artist).text : "",
        SHARE_DOMAIN,
        "0123456789 ·…",
      ].join(""),
      700: SHARE_WORDMARK + SHARE_WORDMARK_LATIN,
    }),
  ]);

  return new ImageResponse(createElement(ShareCard, { verse, song, mood, background, fontFamily, boldFontFamily }), {
    width: SHARE_CARD_WIDTH,
    height: SHARE_CARD_HEIGHT,
    fonts,
    headers: { "Cache-Control": CACHE_CONTROL },
  });
}
