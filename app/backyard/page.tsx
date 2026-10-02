"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BackToStartLink } from "@/components/BackToStartLink";
import { CrisisNotice } from "@/components/CrisisNotice";
import { LoadingDots } from "@/components/LoadingDots";
import { BackyardInput } from "@/components/backyard/BackyardInput";
import { BackyardResult } from "@/components/backyard/BackyardResult";
import { useWorld } from "@/lib/world/WorldContext";
import { saveDraft } from "@/lib/backyard/draft";
import { combineWithChurchContext, takeChurchContext } from "@/lib/backyard/churchContext";
import { getRecommendationHistory, recordRecommendation } from "@/lib/recommend/history";
import type { RecommendResult } from "@/lib/recommend/types";
import type { AnalysisResult } from "@/lib/analysis/types";

type Phase = "input" | "loading" | "result" | "crisis" | "error";

const MAX_SONG_RETRIES = 3;

export default function BackyardPage() {
  const { flyTo } = useWorld();
  const [phase, setPhase] = useState<Phase>("input");
  const [text, setText] = useState("");
  const [tags, setTags] = useState<AnalysisResult | null>(null);
  const [result, setResult] = useState<RecommendResult | null>(null);
  const [encouragement, setEncouragement] = useState("");
  const [songRetries, setSongRetries] = useState(0);
  const [churchTranscript, setChurchTranscript] = useState("");
  const hasTakenChurchContext = useRef(false);

  useEffect(() => {
    flyTo("backyard");
  }, [flyTo]);

  useEffect(() => {
    // takeChurchContext는 읽으면서 지우므로 Strict Mode 두 번째 실행이 빈 값으로 덮어쓰지 않게 막는다.
    if (hasTakenChurchContext.current) return;
    hasTakenChurchContext.current = true;
    setChurchTranscript(takeChurchContext());
  }, []);

  const fetchRecommendation = useCallback(
    async (
      tagsToUse: AnalysisResult,
      fullText: string,
      include?: { verse?: boolean; song?: boolean },
    ): Promise<boolean> => {
      setPhase("loading");
      try {
        const history = getRecommendationHistory();
        const response = await fetch("/api/recommend", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tags: tagsToUse,
            history,
            include,
            mode: "backyard",
            text: include?.verse === false ? undefined : fullText,
          }),
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
        setEncouragement((prev) => data.resultLine ?? prev);
        setPhase("result");
        return true;
      } catch {
        setPhase("error");
        return false;
      }
    },
    [],
  );

  const handleInputFinish = useCallback(
    async (writtenText: string) => {
      const fullText = combineWithChurchContext(churchTranscript, writtenText);
      setText(fullText);
      setPhase("loading");
      try {
        const response = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ transcript: fullText, source: "backyard" }),
        });
        if (!response.ok) throw new Error("analyze_failed");

        const analyzed = (await response.json()) as AnalysisResult;
        if (analyzed.crisis) {
          setPhase("crisis");
          return;
        }
        setTags(analyzed);
        if (!(await fetchRecommendation(analyzed, fullText))) saveDraft(writtenText);
      } catch {
        // BackyardInput이 제출 시 임시 저장을 지우므로, 실패하면 다시 저장해 글을 잃지 않게 한다.
        saveDraft(writtenText);
        setPhase("error");
      }
    },
    [churchTranscript, fetchRecommendation],
  );

  const handleRetrySong = useCallback(() => {
    if (!tags || songRetries >= MAX_SONG_RETRIES) return;
    setSongRetries((count) => count + 1);
    void fetchRecommendation(tags, text, { verse: false, song: true });
  }, [fetchRecommendation, songRetries, tags, text]);

  const resetResult = useCallback(() => {
    setPhase("input");
    setText("");
    setTags(null);
    setResult(null);
    setEncouragement("");
    setSongRetries(0);
  }, []);

  const handleRestart = useCallback(() => {
    resetResult();
    setChurchTranscript("");
  }, [resetResult]);

  return (
    <main className="pointer-events-none relative flex min-h-dvh flex-1 flex-col text-[#f4f1ff]">
      {phase === "input" && (
        <BackyardInput onFinish={handleInputFinish} hasChurchContext={churchTranscript.length > 0} />
      )}

      {phase === "loading" && (
        <div className="pointer-events-none flex flex-1 flex-col items-center justify-center gap-3">
          <p className="pointer-events-auto text-sm text-[#f4f1ff]/60">
            천천히 읽고 있어요…
          </p>
          <LoadingDots className="text-[#f4f1ff]/60" />
        </div>
      )}

      {phase === "result" && (
        <BackyardResult
          encouragement={encouragement}
          summary={tags?.summary ?? ""}
          verse={result?.verse ?? null}
          song={result?.song ?? null}
          retriesLeft={MAX_SONG_RETRIES - songRetries}
          onRetrySong={handleRetrySong}
          onRestart={handleRestart}
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
            onClick={resetResult}
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
    </main>
  );
}
