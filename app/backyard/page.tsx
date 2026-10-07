"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BackToStartLink } from "@/components/BackToStartLink";
import { CrisisNotice } from "@/components/CrisisNotice";
import { SnakeAppleLoader } from "@/components/SnakeAppleLoader";
import { BackyardInput } from "@/components/backyard/BackyardInput";
import { BackyardResult } from "@/components/backyard/BackyardResult";
import { useBottomNavHidden } from "@/components/nav/BottomNavContext";
import { useResumeResult } from "@/lib/bookmarks/useResumeResult";
import { useWorld } from "@/lib/world/WorldContext";
import { saveDraft } from "@/lib/backyard/draft";
import { combineWithChurchContext, takeChurchContext } from "@/lib/backyard/churchContext";
import { getRecommendationHistory, recordRecommendation } from "@/lib/recommend/history";
import type { RecommendResult } from "@/lib/recommend/types";
import type { AnalysisResult } from "@/lib/analysis/types";
import { REQUEST_TIMEOUT_MS, requestJson } from "@/shared/lib/requestJson";
import { createClientRequestId } from "@/lib/counsel/clientRequestId";
import type { ChurchTurn, CounselTranscript } from "@/lib/counsel/transcript";

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
  const [churchTurns, setChurchTurns] = useState<ChurchTurn[]>([]);
  const [transcriptPayload, setTranscriptPayload] = useState<CounselTranscript | null>(null);
  const [counselRecordId, setCounselRecordId] = useState<string | null>(null);
  const clientRequestId = useRef<string | undefined>(undefined);
  const hasTakenChurchContext = useRef(false);
  const inputInFlight = useRef(false);
  const recommendInFlight = useRef(false);
  const [songLoading, setSongLoading] = useState(false);
  const requestController = useRef<AbortController | null>(null);
  useBottomNavHidden(phase === "input");

  useResumeResult("backyard", {
    onStart: () => setPhase("loading"),
    onRestore: (pending) => {
      setResult({ verse: pending.verse, song: pending.song });
      setEncouragement(pending.resultLine);
      setSongRetries(MAX_SONG_RETRIES);
      setPhase("result");
    },
  });

  useEffect(() => {
    return () => requestController.current?.abort();
  }, []);

  useEffect(() => {
    flyTo("backyard");
  }, [flyTo]);

  useEffect(() => {
    // takeChurchContext는 읽으면서 지우므로 Strict Mode 두 번째 실행이 빈 값으로 덮어쓰지 않게 막는다.
    if (hasTakenChurchContext.current) return;
    hasTakenChurchContext.current = true;
    const context = takeChurchContext();
    setChurchTranscript(context.transcript);
    setChurchTurns(context.turns);
    clientRequestId.current = context.clientRequestId ?? undefined;
  }, []);

  const fetchRecommendation = useCallback(
    async (
      tagsToUse: AnalysisResult,
      fullText: string,
      payload: CounselTranscript | null,
      recordId: string | null,
      include?: { verse?: boolean; song?: boolean },
    ): Promise<boolean> => {
      if (recommendInFlight.current) return false;
      recommendInFlight.current = true;
      const controller = new AbortController();
      requestController.current = controller;
      if (include?.verse === false) setSongLoading(true);
      else setPhase("loading");
      try {
        const history = getRecommendationHistory();
        clientRequestId.current ??= createClientRequestId();
        const data = await requestJson<RecommendResult>(
          "/api/recommend",
          {
            tags: tagsToUse,
            history,
            include,
            mode: "backyard",
            text: include?.verse === false ? undefined : fullText,
            transcript: include?.verse === false ? undefined : (payload ?? undefined),
            clientRequestId: clientRequestId.current,
            counselRecordId: recordId ?? undefined,
          },
          { timeoutMs: REQUEST_TIMEOUT_MS.recommend, signal: controller.signal },
        );
        if (controller.signal.aborted) return false;
        setResult((prev) => ({
          verse: include?.verse === false ? (prev?.verse ?? null) : data.verse,
          song:
            include?.song === false
              ? (prev?.song ?? null)
              : include?.verse === false
                ? (data.song ?? prev?.song ?? null)
                : data.song,
        }));
        if (include?.verse !== false) setCounselRecordId(data.counselRecordId ?? null);
        recordRecommendation({
          songId: include?.song === false ? null : (data.song?.id ?? null),
          verseId: include?.verse === false ? null : (data.verse?.id ?? null),
          date: new Date().toISOString(),
        });
        setEncouragement((prev) => data.resultLine ?? prev);
        setPhase("result");
        return true;
      } catch {
        if (controller.signal.aborted) return false;
        setPhase(include?.verse === false ? "result" : "error");
        return false;
      } finally {
        recommendInFlight.current = false;
        setSongLoading(false);
      }
    },
    [],
  );

  const handleInputFinish = useCallback(
    async (writtenText: string) => {
      if (inputInFlight.current) return;
      inputInFlight.current = true;
      const fullText = combineWithChurchContext(churchTranscript, writtenText);
      setText(fullText);
      const payload: CounselTranscript = { version: 1 };
      if (churchTurns.length > 0) payload.church = churchTurns;
      if (writtenText) payload.backyard = { text: writtenText };
      setTranscriptPayload(payload);
      setPhase("loading");
      const controller = new AbortController();
      requestController.current = controller;
      try {
        const analyzed = await requestJson<AnalysisResult>(
          "/api/analyze",
          { transcript: fullText, source: "backyard" },
          { timeoutMs: REQUEST_TIMEOUT_MS.analyze, signal: controller.signal },
        );
        if (controller.signal.aborted) {
          saveDraft(writtenText);
          return;
        }
        if (analyzed.crisis) {
          setPhase("crisis");
          return;
        }
        setTags(analyzed);
        if (!(await fetchRecommendation(analyzed, fullText, payload, null))) saveDraft(writtenText);
      } catch {
        // BackyardInput이 제출 시 임시 저장을 지우므로, 실패하면 다시 저장해 글을 잃지 않게 한다.
        saveDraft(writtenText);
        if (controller.signal.aborted) return;
        setPhase("error");
      } finally {
        inputInFlight.current = false;
      }
    },
    [churchTranscript, churchTurns, fetchRecommendation],
  );

  const handleRetrySong = useCallback(() => {
    if (!tags || songRetries >= MAX_SONG_RETRIES || recommendInFlight.current) return;
    setSongRetries((count) => count + 1);
    void fetchRecommendation(tags, text, transcriptPayload, counselRecordId, { verse: false, song: true });
  }, [counselRecordId, fetchRecommendation, songRetries, tags, text, transcriptPayload]);

  const resetResult = useCallback(() => {
    setPhase("input");
    setText("");
    setTags(null);
    setResult(null);
    setEncouragement("");
    setSongRetries(0);
    setTranscriptPayload(null);
    setCounselRecordId(null);
    clientRequestId.current = undefined;
  }, []);

  const handleRestart = useCallback(() => {
    resetResult();
    setChurchTranscript("");
    setChurchTurns([]);
  }, [resetResult]);

  return (
    <main className="pointer-events-none relative flex min-h-dvh flex-1 flex-col text-[#f4f1ff]">
      {phase === "input" && (
        <BackyardInput onFinish={handleInputFinish} hasChurchContext={churchTranscript.length > 0} />
      )}

      {phase === "loading" && (
        <div className="pointer-events-none flex flex-1 flex-col items-center justify-center gap-3">
          <SnakeAppleLoader />
          <p className="pointer-events-auto text-sm text-[#f4f1ff]/60">
            천천히 읽고 있어요…
          </p>
        </div>
      )}

      {phase === "result" && (
        <BackyardResult
          encouragement={encouragement}
          summary={tags?.summary ?? ""}
          verse={result?.verse ?? null}
          song={result?.song ?? null}
          retriesLeft={MAX_SONG_RETRIES - songRetries}
          songLoading={songLoading}
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
