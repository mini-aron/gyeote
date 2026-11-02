import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ShareView } from "@/components/share/ShareView";
import { SHARE_CARD_HEIGHT, SHARE_CARD_WIDTH } from "@/components/share/ShareCard";
import { buildShareCardPath, buildShareUrl } from "@/lib/share/buildShareUrl";
import { getShareContent } from "@/lib/share/getShareContent";
import { getSiteOrigin } from "@/lib/share/getSiteOrigin";
import { parseMood } from "@/lib/share/parseMood";

const DESCRIPTION_LENGTH = 90;

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function firstValue(value: string | string[] | undefined): string | null {
  return (Array.isArray(value) ? value[0] : value) ?? null;
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ verseId: string }>;
  searchParams: SearchParams;
}): Promise<Metadata> {
  const [{ verseId }, query] = await Promise.all([params, searchParams]);
  const content = await getShareContent(verseId, firstValue(query.song));
  if (!content) return {};

  const { verse, song } = content;
  const mood = parseMood(firstValue(query.mood));
  const origin = getSiteOrigin();
  const image = {
    url: buildShareCardPath(verse.id, song?.id ?? null, mood),
    width: SHARE_CARD_WIDTH,
    height: SHARE_CARD_HEIGHT,
  };
  const pageUrl = buildShareUrl(origin, verse.id, song?.id ?? null, mood);
  const title = `곁에 — ${verse.reference}`;
  const flatBody = verse.body.replace(/\s+/g, " ").trim();
  const description =
    flatBody.length > DESCRIPTION_LENGTH ? `${flatBody.slice(0, DESCRIPTION_LENGTH)}…` : flatBody;

  return {
    metadataBase: new URL(origin),
    title,
    description,
    alternates: { canonical: pageUrl },
    openGraph: { title, description, type: "website", url: pageUrl, images: [image] },
    twitter: { card: "summary_large_image", title, description, images: [image.url] },
  };
}

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ verseId: string }>;
  searchParams: SearchParams;
}) {
  const [{ verseId }, query] = await Promise.all([params, searchParams]);
  const content = await getShareContent(verseId, firstValue(query.song));
  if (!content) notFound();

  return <ShareView content={content} mood={parseMood(firstValue(query.mood))} />;
}
