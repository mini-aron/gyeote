"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { BackToStartLink } from "@/components/BackToStartLink";
import { CrisisNotice } from "@/components/CrisisNotice";
import { SnakeAppleLoader } from "@/components/SnakeAppleLoader";
import { MoodBadge } from "@/components/world/MoodBadge";
import { ChurchChat } from "@/components/church/ChurchChat";
import { ChurchResult } from "@/components/church/ChurchResult";
import { useBottomNavHidden } from "@/components/nav/BottomNavContext";
import { useResumeResult } from "@/lib/bookmarks/useResumeResult";
import { useWorld } from "@/lib/world/WorldContext";
import { saveChurchContext } from "@/lib/backyard/churchContext";
import { getMoodForTimeBand, type MoodKey } from "@/lib/world/moods";
import { getTimeBand } from "@/lib/greeting";
import { revalidateCounselRecords } from "@/lib/calendar/actions";
import { getRecommendationHistory, recordRecommendation } from "@/lib/recommend/history";
import type { RecommendResult } from "@/lib/recommend/types";
import type { AnalysisResult } from "@/lib/analysis/types";
import { REQUEST_TIMEOUT_MS, requestJson } from "@/shared/lib/requestJson";
import { createClientRequestId } from "@/lib/counsel/clientRequestId";
import type { ChurchTurn } from "@/lib/counsel/transcript";

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
  const [turns, setTurns] = useState<ChurchTurn[]>([]);
  const [counselRecordId, setCounselRecordId] = useState<string | null>(null);
  const clientRequestId = useRef<string | undefined>(undefined);
  const chatInFlight = useRef(false);
  const recommendInFlight = useRef(false);
  const [songLoading, setSongLoading] = useState(false);
  const requestController = useRef<AbortController | null>(null);
  const router = useRouter();
  useBottomNavHidden(phase === "chat");

  useResumeResult("church", {
    onStart: () => setPhase("loading"),
    onRestore: (pending) => {
      setResult({ verse: pending.verse, song: pending.song });
      setResultLine(pending.resultLine);
      setSongRetries(MAX_SONG_RETRIES);
      setPhase("result");
    },
  });

  useEffect(() => {
    return () => requestController.current?.abort();
  }, []);

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
    async (
      tagsToUse: AnalysisResult,
      chatTurns: ChurchTurn[],
      recordId: string | null,
      include?: { verse?: boolean; song?: boolean },
    ) => {
      if (recommendInFlight.current) return;
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
            transcript:
              include?.verse !== false && chatTurns.length > 0
                ? { version: 1, church: chatTurns }
                : undefined,
            clientRequestId: clientRequestId.current,
            counselRecordId: recordId ?? undefined,
          },
          { timeoutMs: REQUEST_TIMEOUT_MS.recommend, signal: controller.signal },
        );
        if (controller.signal.aborted) return;
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
        // 곡만 다시 뽑는 재시도에서는 서버가 resultLine을 아예 안 보낸다 —
        // 기존 글을 그대로 둔다.
        setResultLine((prev) => data.resultLine ?? prev);
        if (data.counselRecordId && (include?.verse !== false || data.rerollStatus === "ok")) void revalidateCounselRecords().catch(() => {});
        setPhase("result");
      } catch {
        if (controller.signal.aborted) return;
        setPhase(include?.verse === false ? "result" : "error");
      } finally {
        recommendInFlight.current = false;
        setSongLoading(false);
      }
    },
    [],
  );

  const handleChatFinish = useCallback(
    async (chatTranscript: string, chatTurns: ChurchTurn[]) => {
      if (chatInFlight.current) return;
      chatInFlight.current = true;
      setTranscript(chatTranscript);
      setTurns(chatTurns);
      setPhase("loading");
      const controller = new AbortController();
      requestController.current = controller;
      try {
        const analyzed = await requestJson<AnalysisResult>(
          "/api/analyze",
          { transcript: chatTranscript },
          { timeoutMs: REQUEST_TIMEOUT_MS.analyze, signal: controller.signal },
        );
        if (controller.signal.aborted) return;
        if (analyzed.crisis) {
          setPhase("crisis");
          return;
        }
        setTags(analyzed);
        await fetchRecommendation(analyzed, chatTurns, null);
      } catch {
        if (controller.signal.aborted) return;
        setPhase("error");
      } finally {
        chatInFlight.current = false;
      }
    },
    [fetchRecommendation],
  );

  const handleRetrySong = useCallback(() => {
    if (!tags || songRetries >= MAX_SONG_RETRIES || recommendInFlight.current) return;
    setSongRetries((count) => count + 1);
    void fetchRecommendation(tags, turns, counselRecordId, { verse: false, song: true });
  }, [counselRecordId, fetchRecommendation, songRetries, tags, turns]);

  const handleRestart = useCallback(() => {
    setPhase("chat");
    setTags(null);
    setResult(null);
    setResultLine("");
    setSongRetries(0);
    setTranscript("");
    setTurns([]);
    setCounselRecordId(null);
    clientRequestId.current = undefined;
  }, []);

  const handleMoveToBackyard = useCallback(
    (chatTranscript: string, chatTurns: ChurchTurn[], continuesRecord = true) => {
      // 이미 결과가 저장된 대화는 같은 id를 쓰면 뒤뜰 기록이 중복으로 버려지므로 새 id로 이어간다.
      clientRequestId.current ??= createClientRequestId();
      saveChurchContext({
        transcript: chatTranscript,
        turns: chatTurns,
        clientRequestId: continuesRecord ? (clientRequestId.current ?? null) : (createClientRequestId() ?? null),
      });
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
          <SnakeAppleLoader />
          <p className="pointer-events-auto text-sm text-[#f4f1ff]/60">
            잠시만요, 생각하고 있어요…
          </p>
        </div>
      )}

      {phase === "result" && (
        <ChurchResult
          resultLine={resultLine}
          verse={result?.verse ?? null}
          song={result?.song ?? null}
          retriesLeft={MAX_SONG_RETRIES - songRetries}
          songLoading={songLoading}
          onRetrySong={handleRetrySong}
          onRestart={handleRestart}
          onMoveToBackyard={() => handleMoveToBackyard(transcript, turns, false)}
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
