"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { GLASS_CARD } from "@/components/glassCard";
import {
  createCalendarEvent,
  deleteCalendarEvent,
  updateCalendarEvent,
} from "@/lib/calendar/actions";
import { formatEventTime } from "@/lib/calendar/dateUtils";
import type { DayEvent } from "@/lib/calendar/types";

interface EventSectionProps {
  date: string;
  events: DayEvent[];
}

export function EventSection({ date, events }: EventSectionProps) {
  const [editingId, setEditingId] = useState<string | "new" | null>(null);

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm text-[#f4f1ff]/65">일정</h2>
        {editingId === null && (
          <button
            type="button"
            onClick={() => setEditingId("new")}
            className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs text-[#f4f1ff]/85"
          >
            + 일정 추가
          </button>
        )}
      </div>

      {events.length === 0 && editingId !== "new" && (
        <p className={`${GLASS_CARD} px-5 py-6 text-center text-sm text-[#f4f1ff]/60`}>이날 일정이 없어요.</p>
      )}

      {events.map((event) =>
        editingId === event.id ? (
          <EventForm key={event.id} date={date} event={event} onDone={() => setEditingId(null)} />
        ) : (
          <EventItem key={event.id} event={event} onEdit={() => setEditingId(event.id)} />
        ),
      )}

      {editingId === "new" && <EventForm date={date} onDone={() => setEditingId(null)} />}
    </section>
  );
}

function EventItem({ event, onEdit }: { event: DayEvent; onEdit: () => void }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState(false);
  const [pending, startTransition] = useTransition();

  const handleDelete = () => {
    setError(false);
    startTransition(async () => {
      const result = await deleteCalendarEvent(event.id);
      if (result.ok) router.refresh();
      else setError(true);
    });
  };

  return (
    <div className={`${GLASS_CARD} flex flex-col gap-2 px-5 py-4`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium">
            {event.time && <span className="mr-2 text-[#7fd6c2]">{formatEventTime(event.time)}</span>}
            {event.title}
          </p>
          {event.memo && (
            <p className="mt-1 whitespace-pre-line text-xs leading-5 text-[#f4f1ff]/70">{event.memo}</p>
          )}
        </div>
        {!confirming && (
          <div className="flex shrink-0 gap-3 text-xs text-[#f4f1ff]/60">
            <button type="button" onClick={onEdit}>
              수정
            </button>
            <button type="button" onClick={() => setConfirming(true)}>
              삭제
            </button>
          </div>
        )}
      </div>
      {confirming && (
        <div className="flex flex-col gap-2 border-t border-white/10 pt-3 text-xs">
          <p>이 일정을 삭제할까요?</p>
          {error && <p className="text-[#ffb3b3]">삭제하지 못했어요. 잠시 후 다시 시도해 주세요.</p>}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setConfirming(false)}
              disabled={pending}
              className="rounded-xl border border-white/10 px-3 py-2 text-[#f4f1ff]/80"
            >
              취소
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={pending}
              className="rounded-xl bg-[#ff8f8f]/80 px-3 py-2 font-medium text-[#1b1530] disabled:opacity-60"
            >
              {pending ? "삭제 중" : "삭제"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function EventForm({ date, event, onDone }: { date: string; event?: DayEvent; onDone: () => void }) {
  const router = useRouter();
  const [title, setTitle] = useState(event?.title ?? "");
  const [time, setTime] = useState(event?.time ? formatEventTime(event.time) : "");
  const [memo, setMemo] = useState(event?.memo ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const handleSubmit = (submitEvent: React.FormEvent) => {
    submitEvent.preventDefault();
    if (!title.trim()) {
      setError("제목을 입력해 주세요.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const input = { date, time: time || null, title, memo: memo || null };
      const result = event
        ? await updateCalendarEvent({ ...input, id: event.id })
        : await createCalendarEvent(input);
      if (result.ok) {
        router.refresh();
        onDone();
      } else {
        setError("저장하지 못했어요. 입력 내용을 확인하고 다시 시도해 주세요.");
      }
    });
  };

  const fieldClass =
    "w-full rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-sm text-[#f4f1ff] placeholder:text-[#f4f1ff]/40 focus:outline-none focus:ring-1 focus:ring-[#c9bcff]";

  return (
    <form onSubmit={handleSubmit} className={`${GLASS_CARD} flex flex-col gap-3 px-5 py-4`}>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        maxLength={50}
        placeholder="일정 제목"
        aria-label="일정 제목"
        className={fieldClass}
      />
      <input
        type="time"
        value={time}
        onChange={(e) => setTime(e.target.value)}
        aria-label="시간 (선택)"
        className={fieldClass}
      />
      <textarea
        value={memo}
        onChange={(e) => setMemo(e.target.value)}
        maxLength={300}
        rows={3}
        placeholder="메모 (선택)"
        aria-label="메모"
        className={fieldClass}
      />
      {error && <p className="text-xs text-[#ffb3b3]">{error}</p>}
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onDone}
          disabled={pending}
          className="rounded-xl border border-white/10 px-3 py-2 text-xs text-[#f4f1ff]/80"
        >
          취소
        </button>
        <button
          type="submit"
          disabled={pending}
          className="rounded-xl bg-[#c9bcff]/80 px-3 py-2 text-xs font-medium text-[#1b1530] disabled:opacity-60"
        >
          {pending ? "저장 중" : "저장"}
        </button>
      </div>
    </form>
  );
}
