"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { getTimeBand } from "@/lib/greeting";
import { getMoodForTimeBand, type MoodKey } from "@/lib/world/moods";
import { buildShareCardPath } from "@/lib/share/buildShareUrl";
import { buildShareFileName } from "@/lib/share/buildShareFileName";

export type ShareCardStatus = "idle" | "loading" | "ready" | "error";

interface ShareCardResult {
  key: string;
  status: "ready" | "error";
  file: File | null;
  previewUrl: string | null;
}

const subscribeNone = () => () => {};
const getCurrentMood = (): MoodKey => getMoodForTimeBand(getTimeBand(new Date()));

export function useShareCard(verseId: string | undefined, songId: string | undefined) {
  const mood = useSyncExternalStore(subscribeNone, getCurrentMood, () => null);
  const [result, setResult] = useState<ShareCardResult | null>(null);
  const key = verseId && mood ? [verseId, songId ?? "", mood].join("|") : null;

  useEffect(() => {
    if (!verseId || !mood) return;
    const requestKey = [verseId, songId ?? "", mood].join("|");
    const controller = new AbortController();

    fetch(buildShareCardPath(verseId, songId ?? null, mood), { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`share-card ${response.status}`);
        return response.blob();
      })
      .then((blob) => {
        const file = new File([blob], buildShareFileName(new Date()), { type: "image/png" });
        setResult({ key: requestKey, status: "ready", file, previewUrl: URL.createObjectURL(file) });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        console.error("share card prefetch failed", error);
        setResult({ key: requestKey, status: "error", file: null, previewUrl: null });
      });

    return () => controller.abort();
  }, [verseId, songId, mood]);

  const previewUrl = result?.previewUrl;
  useEffect(() => {
    if (!previewUrl) return;
    return () => URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  const current = result && result.key === key ? result : null;
  const status: ShareCardStatus = !key ? "idle" : (current?.status ?? "loading");
  return { mood, status, file: current?.file ?? null, previewUrl: current?.previewUrl ?? null };
}
