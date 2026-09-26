"use client";

import { useCallback, useEffect, useState } from "react";
import { MoodSwitcher } from "@/components/world/MoodSwitcher";
import { ChurchChat } from "@/components/church/ChurchChat";
import { ChurchResult } from "@/components/church/ChurchResult";
import { useWorld } from "@/lib/world/WorldContext";
import type { MoodKey } from "@/lib/world/moods";
import { analyzeConversation } from "@/lib/church/analyze";
import { pickResultLine } from "@/lib/church/resultLines";
import { getRecommendationHistory, recordRecommendation } from "@/lib/recommend/history";
import type { RecommendResult } from "@/lib/recommend/types";

type Phase = "chat" | "loading" | "result" | "error";

const MAX_SONG_RETRIES = 3;

export default function ChurchPage() {
  const [mood, setMoodState] = useState<MoodKey>("night");
  const { flyTo, setMood } = useWorld();
  const [phase, setPhase] = useState<Phase>("chat");
  const [result, setResult] = useState<RecommendResult | null>(null);
  const [resultLine, setResultLine] = useState("");
  const [songRetries, setSongRetries] = useState(0);

  useEffect(() => {
    flyTo("church");
  }, [flyTo]);

  useEffect(() => {
    setMood(mood);
  }, [mood, setMood]);

  const fetchRecommendation = useCallback(
    async (include?: { verse?: boolean; song?: boolean }) => {
      setPhase("loading");
      try {
        const tags = analyzeConversation();
        const history = getRecommendationHistory();
        const response = await fetch("/api/recommend", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tags, history, include }),
        });
        if (!response.ok) throw new Error("recommend_failed");

        const data = (await response.json()) as RecommendResult;
        setResult((prev) => ({
          verse: include?.verse === false ? (prev?.verse ?? null) : data.verse,
          song: include?.song === false ? (prev?.song ?? null) : data.song,
        }));
        recordRecommendation({
          songId: include?.song === false ? null : (data.song?.id ?? null),
          verseId: include?.verse === false ? null : (data.verse?.id ?? null),
          date: new Date().toISOString(),
        });
        setResultLine((prev) => prev || pickResultLine());
        setPhase("result");
      } catch {
        setPhase("error");
      }
    },
    [],
  );

  const handleChatFinish = useCallback(() => {
    void fetchRecommendation();
  }, [fetchRecommendation]);

  const handleRetrySong = useCallback(() => {
    if (songRetries >= MAX_SONG_RETRIES) return;
    setSongRetries((count) => count + 1);
    void fetchRecommendation({ verse: false, song: true });
  }, [fetchRecommendation, songRetries]);

  const handleRestart = useCallback(() => {
    setPhase("chat");
    setResult(null);
    setResultLine("");
    setSongRetries(0);
  }, []);

  return (
    <main className="pointer-events-none relative flex min-h-dvh flex-1 flex-col text-[#f4f1ff]">
      {phase === "chat" && <ChurchChat onFinish={handleChatFinish} />}

      {phase === "loading" && (
        <div className="pointer-events-none flex flex-1 items-center justify-center">
          <p className="pointer-events-auto text-sm text-[#f4f1ff]/60">
            잠깐만, 생각하고 있어…
          </p>
        </div>
      )}

      {phase === "result" && (
        <ChurchResult
          resultLine={resultLine}
          verse={result?.verse ?? null}
          song={result?.song ?? null}
          retriesLeft={MAX_SONG_RETRIES - songRetries}
          onRetrySong={handleRetrySong}
          onRestart={handleRestart}
        />
      )}

      {phase === "error" && (
        <div className="pointer-events-none flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
          <p className="pointer-events-auto text-sm text-[#f4f1ff]/60">
            지금은 추천을 가져올 수 없어. 잠시 후 다시 들러줘.
          </p>
          <button
            type="button"
            onClick={handleRestart}
            className="pointer-events-auto rounded-xl border border-white/10 bg-white/[0.06] px-4 py-2 text-sm"
          >
            처음부터
          </button>
        </div>
      )}

      <div className="pointer-events-none absolute right-4 top-[calc(16px+env(safe-area-inset-top,0px))]">
        <div className="pointer-events-auto">
          <MoodSwitcher mood={mood} onChange={setMoodState} />
        </div>
      </div>
    </main>
  );
}
