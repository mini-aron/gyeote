"use client";

import { useEffect, useRef, useState } from "react";
import { LoadingDots } from "@/components/LoadingDots";
import { getTimeBand } from "@/lib/greeting";
import { FIRST_QUESTIONS, FOLLOW_UP_QUESTION } from "@/lib/church/fallbackQuestions";
import { MIN_TURNS, type GeneratedQuestion } from "@/lib/church/types";

const FREE_TEXT_MAX_LENGTH = 200;
const STOP_HERE_TEXT = "여기까지만 이야기할래";

interface ChatMessage {
  from: "app" | "user";
  text: string;
}

function formatTranscript(messages: ChatMessage[]): string {
  return messages.map((m) => `${m.from === "app" ? "상대방" : "나"}: ${m.text}`).join("\n");
}

// 네트워크 자체가 실패했을 때만 쓰는 클라이언트 폴백 — 서버(app/api/church-question)가
// 이미 자체 폴백을 갖고 있으니, 여기는 fetch()가 아예 던지는 경우의 안전망이다.
function clientFallback(turnNumber: number): GeneratedQuestion {
  if (turnNumber === 1) return { ...FIRST_QUESTIONS[getTimeBand(new Date())], isFinal: false };
  return { ...FOLLOW_UP_QUESTION, isFinal: true };
}

async function fetchQuestion(turnNumber: number, transcript: string): Promise<GeneratedQuestion> {
  const response = await fetch("/api/church-question", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ turnNumber, transcript }),
  });
  if (!response.ok) throw new Error("question_failed");
  return (await response.json()) as GeneratedQuestion;
}

export function ChurchChat({ onFinish }: { onFinish: (transcript: string) => void }) {
  const [turnNumber, setTurnNumber] = useState(1);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<GeneratedQuestion | null>(null);
  const [isQuestionLoading, setIsQuestionLoading] = useState(true);
  const [freeText, setFreeText] = useState("");
  const hasFetchedFirstQuestion = useRef(false);

  useEffect(() => {
    // Strict Mode 이중 실행 방지 — 첫 질문을 두 번 요청하지 않게 한다
    // (components/StartScreen.tsx와 동일한 패턴).
    if (hasFetchedFirstQuestion.current) return;
    hasFetchedFirstQuestion.current = true;

    fetchQuestion(1, "")
      .catch(() => clientFallback(1))
      .then((question) => {
        setCurrentQuestion(question);
        setMessages([{ from: "app", text: question.question }]);
        setIsQuestionLoading(false);
      });
  }, []);

  async function answer(text: string) {
    const trimmed = text.trim();
    if (!trimmed || isQuestionLoading || !currentQuestion) return;

    setFreeText("");
    // setMessages는 비동기라 방금 추가한 답변이 messages 상태엔 아직 안
    // 반영돼 있다 — onFinish로 넘길 transcript는 이 변수로 직접 조립한다.
    const updatedMessages = [...messages, { from: "user" as const, text: trimmed }];
    setMessages(updatedMessages);

    if (currentQuestion.isFinal) {
      onFinish(formatTranscript(updatedMessages));
      return;
    }

    setIsQuestionLoading(true);
    const nextTurnNumber = turnNumber + 1;
    const nextQuestion = await fetchQuestion(nextTurnNumber, formatTranscript(updatedMessages)).catch(
      () => clientFallback(nextTurnNumber),
    );
    setTurnNumber(nextTurnNumber);
    setCurrentQuestion(nextQuestion);
    setMessages([...updatedMessages, { from: "app", text: nextQuestion.question }]);
    setIsQuestionLoading(false);
  }

  function stopHere() {
    if (isQuestionLoading || !currentQuestion) return;
    const updatedMessages = [...messages, { from: "user" as const, text: STOP_HERE_TEXT }];
    setMessages(updatedMessages);
    onFinish(formatTranscript(updatedMessages));
  }

  return (
    <div className="pointer-events-none flex flex-1 flex-col justify-end px-4 pb-[calc(96px+env(safe-area-inset-bottom,0px))] pt-24">
      <div className="pointer-events-auto flex flex-col gap-4">
        <div className="flex flex-col gap-3">
          {messages.map((message, index) => (
            <ChatBubble key={index} from={message.from} text={message.text} />
          ))}
          {isQuestionLoading && (
            <div className="flex justify-start">
              <div className="rounded-2xl bg-white/[0.08] px-4 py-3 text-[#f4f1ff]">
                <LoadingDots />
              </div>
            </div>
          )}
        </div>

        {currentQuestion && !isQuestionLoading && (
          <div className="flex flex-wrap gap-2">
            {currentQuestion.choices.map((choice) => (
              <button
                key={choice}
                type="button"
                onClick={() => answer(choice)}
                className="rounded-full border border-white/15 bg-white/[0.06] px-4 py-2 text-sm text-[#f4f1ff]/90 backdrop-blur-md transition-colors hover:bg-white/[0.12]"
              >
                {choice}
              </button>
            ))}
            {turnNumber >= MIN_TURNS && (
              <button
                type="button"
                onClick={stopHere}
                className="rounded-full border border-white/10 bg-transparent px-4 py-2 text-sm text-[#f4f1ff]/60 backdrop-blur-md transition-colors hover:bg-white/[0.08] hover:text-[#f4f1ff]/90"
              >
                {STOP_HERE_TEXT}
              </button>
            )}
          </div>
        )}

        <form
          className="flex items-center gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            answer(freeText);
          }}
        >
          <input
            value={freeText}
            onChange={(event) => setFreeText(event.target.value.slice(0, FREE_TEXT_MAX_LENGTH))}
            placeholder="직접 입력하기"
            maxLength={FREE_TEXT_MAX_LENGTH}
            disabled={isQuestionLoading}
            className="flex-1 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-[#f4f1ff] placeholder:text-[#f4f1ff]/40 focus:outline-none disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={isQuestionLoading}
            className="rounded-xl border border-white/10 bg-white/[0.08] px-3 py-2 text-sm disabled:opacity-50"
          >
            보내기
          </button>
        </form>
      </div>
    </div>
  );
}

function ChatBubble({ from, text }: { from: ChatMessage["from"]; text: string }) {
  const isApp = from === "app";
  return (
    <div className={`flex ${isApp ? "justify-start" : "justify-end"}`}>
      <p
        className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm leading-relaxed ${
          isApp ? "bg-white/[0.08] text-[#f4f1ff]" : "bg-[#ffd9a8]/15 text-[#ffd9a8]"
        }`}
      >
        {text}
      </p>
    </div>
  );
}
