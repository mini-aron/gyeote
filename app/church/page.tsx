"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { BackToStartLink } from "@/components/BackToStartLink";
import { CrisisNotice } from "@/components/CrisisNotice";
import { LoadingDots } from "@/components/LoadingDots";
import { MoodBadge } from "@/components/world/MoodBadge";
import { ChurchChat } from "@/components/church/ChurchChat";
import { ChurchResult } from "@/components/church/ChurchResult";
import { useWorld } from "@/lib/world/WorldContext";
import { saveChurchContext } from "@/lib/backyard/churchContext";
import { getMoodForTimeBand, type MoodKey } from "@/lib/world/moods";
import { getTimeBand } from "@/lib/greeting";
import { getRecommendationHistory, recordRecommendation } from "@/lib/recommend/history";
import type { RecommendResult } from "@/lib/recommend/types";
import type { AnalysisResult } from "@/lib/analysis/types";

type Phase = "chat" | "loading" | "result" | "crisis" | "error";

const MAX_SONG_RETRIES = 3;

export default function ChurchPage() {
  const [mood, setMoodDisplay] = useState<MoodKey | null>(null);
  const hasSetMood = useRef(false);
  const { flyTo, setMood } = useWorld();
  const [phase, setPhase] = useState<Phase>("chat");
  const [tags, setTags] = useState<AnalysisResult | null>(null);
  const [result, setResult] = useState<RecommendResult | null>(null);
  const [resultLine, setResultLine] = useState("");
  const [songRetries, setSongRetries] = useState(0);
  const [transcript, setTranscript] = useState("");
  const router = useRouter();

  useEffect(() => {
    flyTo("church");
  }, [flyTo]);

  useEffect(() => {
    // 현재 시각으로 무드를 한 번만 정한다 — 선택은 못 하고 표시만 한다.
    // Date 기반 클라이언트 전용 계산이라 렌더 중이 아니라 effect에서 읽는다
    // (하이드레이션 불일치 방지, components/StartScreen.tsx와 동일한 패턴).
    if (hasSetMood.current) return;
    hasSetMood.current = true;
    const currentMood = getMoodForTimeBand(getTimeBand(new Date()));
    setMoodDisplay(currentMood);
    setMood(currentMood);
  }, [setMood]);

  const fetchRecommendation = useCallback(
    async (tagsToUse: AnalysisResult, include?: { verse?: boolean; song?: boolean }) => {
      setPhase("loading");
      try {
        const history = getRecommendationHistory();
        const response = await fetch("/api/recommend", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tags: tagsToUse, history, include }),
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
        // 곡만 다시 뽑는 재시도에서는 서버가 resultLine을 아예 안 보낸다 —
        // 기존 글을 그대로 둔다.
        setResultLine((prev) => data.resultLine ?? prev);
        setPhase("result");
      } catch {
        setPhase("error");
      }
    },
    [],
  );

  const handleChatFinish = useCallback(
    async (chatTranscript: string) => {
      setTranscript(chatTranscript);
      setPhase("loading");
      try {
        const response = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ transcript: chatTranscript }),
        });
        if (!response.ok) throw new Error("analyze_failed");

        const analyzed = (await response.json()) as AnalysisResult;
        if (analyzed.crisis) {
          setPhase("crisis");
          return;
        }
        setTags(analyzed);
        await fetchRecommendation(analyzed);
      } catch {
        setPhase("error");
      }
    },
    [fetchRecommendation],
  );

  const handleRetrySong = useCallback(() => {
    if (!tags || songRetries >= MAX_SONG_RETRIES) return;
    setSongRetries((count) => count + 1);
    void fetchRecommendation(tags, { verse: false, song: true });
  }, [fetchRecommendation, songRetries, tags]);

  const handleRestart = useCallback(() => {
    setPhase("chat");
    setTags(null);
    setResult(null);
    setResultLine("");
    setSongRetries(0);
    setTranscript("");
  }, []);

  const handleMoveToBackyard = useCallback(
    (chatTranscript: string) => {
      saveChurchContext(chatTranscript);
      router.push("/backyard");
    },
    [router],
  );

  return (
    <main className="pointer-events-none relative flex min-h-dvh flex-1 flex-col text-[#f4f1ff]">
      {phase === "chat" && (
        <ChurchChat onFinish={handleChatFinish} onMoveToBackyard={handleMoveToBackyard} />
      )}

      {phase === "loading" && (
        <div className="pointer-events-none flex flex-1 flex-col items-center justify-center gap-3">
          <p className="pointer-events-auto text-sm text-[#f4f1ff]/60">
            잠시만요, 생각하고 있어요…
          </p>
          <LoadingDots className="text-[#f4f1ff]/60" />
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
          onMoveToBackyard={() => handleMoveToBackyard(transcript)}
        />
      )}

      {phase === "crisis" && <CrisisNotice onRestart={handleRestart} />}

      {phase === "error" && (
        <div className="pointer-events-none flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
          <p className="pointer-events-auto text-sm text-[#f4f1ff]/60">
            지금은 추천을 가져올 수 없어요. 잠시 후 다시 들러주세요.
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

      <div className="pointer-events-none absolute left-4 top-[calc(16px+env(safe-area-inset-top,0px))]">
        <div className="pointer-events-auto">
          <BackToStartLink />
        </div>
      </div>

      {mood && (
        <div className="pointer-events-none absolute right-4 top-[calc(16px+env(safe-area-inset-top,0px))]">
          <MoodBadge mood={mood} />
        </div>
      )}
    </main>
  );
}
