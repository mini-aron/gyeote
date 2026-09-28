"use client";

import { useEffect, useRef, useState } from "react";
import { getTimeBand } from "@/lib/greeting";
import {
  FIRST_QUESTIONS,
  FOLLOW_UP_QUESTION,
  type FallbackQuestion,
} from "@/lib/church/fallbackQuestions";

const FREE_TEXT_MAX_LENGTH = 200;

interface ChatMessage {
  from: "jesus" | "user";
  text: string;
}

function formatTranscript(messages: ChatMessage[]): string {
  return messages.map((m) => `${m.from === "jesus" ? "예수님" : "나"}: ${m.text}`).join("\n");
}

async function fetchQuestion(turn: 1 | 2, transcript: string): Promise<FallbackQuestion> {
  const response = await fetch("/api/church-question", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ turn, transcript }),
  });
  if (!response.ok) throw new Error("question_failed");
  return (await response.json()) as FallbackQuestion;
}

export function ChurchChat({ onFinish }: { onFinish: (transcript: string) => void }) {
  const [turn, setTurn] = useState<1 | 2>(1);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<FallbackQuestion | null>(null);
  const [isQuestionLoading, setIsQuestionLoading] = useState(true);
  const [freeText, setFreeText] = useState("");
  const hasFetchedFirstQuestion = useRef(false);

  useEffect(() => {
    // Strict Mode 이중 실행 방지 — 첫 질문을 두 번 요청하지 않게 한다
    // (components/StartScreen.tsx와 동일한 패턴).
    if (hasFetchedFirstQuestion.current) return;
    hasFetchedFirstQuestion.current = true;

    fetchQuestion(1, "")
      .catch(() => FIRST_QUESTIONS[getTimeBand(new Date())])
      .then((question) => {
        setCurrentQuestion(question);
        setMessages([{ from: "jesus", text: question.question }]);
        setIsQuestionLoading(false);
      });
  }, []);

  async function answer(text: string) {
    const trimmed = text.trim();
    if (!trimmed || isQuestionLoading) return;

    setFreeText("");
    // setMessages는 비동기라 방금 추가한 답변이 messages 상태엔 아직 안
    // 반영돼 있다 — onFinish로 넘길 transcript는 이 변수로 직접 조립한다.
    const updatedMessages = [...messages, { from: "user" as const, text: trimmed }];
    setMessages(updatedMessages);

    if (turn === 1) {
      setIsQuestionLoading(true);
      const nextQuestion = await fetchQuestion(2, formatTranscript(updatedMessages)).catch(
        () => FOLLOW_UP_QUESTION,
      );
      setTurn(2);
      setCurrentQuestion(nextQuestion);
      setMessages([...updatedMessages, { from: "jesus", text: nextQuestion.question }]);
      setIsQuestionLoading(false);
    } else {
      onFinish(formatTranscript(updatedMessages));
    }
  }

  return (
    <div className="pointer-events-none flex flex-1 flex-col justify-end px-4 pb-[calc(96px+env(safe-area-inset-bottom,0px))] pt-24">
      <div className="pointer-events-auto flex flex-col gap-4">
        <div className="flex flex-col gap-3">
          {messages.map((message, index) => (
            <ChatBubble key={index} from={message.from} text={message.text} />
          ))}
          {isQuestionLoading && <ChatBubble from="jesus" text="…" />}
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
  const isJesus = from === "jesus";
  return (
    <div className={`flex ${isJesus ? "justify-start" : "justify-end"}`}>
      <p
        className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm leading-relaxed ${
          isJesus ? "bg-white/[0.08] text-[#f4f1ff]" : "bg-[#ffd9a8]/15 text-[#ffd9a8]"
        }`}
      >
        {text}
      </p>
    </div>
  );
}
