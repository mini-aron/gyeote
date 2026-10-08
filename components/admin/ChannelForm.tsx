"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { addChannel } from "@/lib/admin/actions";
import {
  CHANNEL_KINDS,
  CHANNEL_KIND_LABELS,
  type ChannelKind,
} from "@/lib/admin/candidateInput";
import {
  ADMIN_BUTTON,
  ADMIN_BUTTON_PRIMARY,
  ADMIN_CARD,
  ADMIN_INPUT,
  ADMIN_LABEL,
} from "./adminStyles";
import { useAdminAction } from "./useAdminAction";

export function ChannelForm() {
  const router = useRouter();
  const { pending, notice, run } = useAdminAction();
  const [input, setInput] = useState("");
  const [kind, setKind] = useState<ChannelKind>("topic");
  const [defaultArtist, setDefaultArtist] = useState("");
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-lg font-medium">수집 채널</h1>
        <button
          type="button"
          className={ADMIN_BUTTON}
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? "닫기" : "채널 추가"}
        </button>
      </div>
      {open && (
        <form
          className={`${ADMIN_CARD} space-y-4 p-4`}
          onSubmit={(event) => {
            event.preventDefault();
            run(
              () => addChannel({ input, kind, defaultArtist }),
              () => {
                setInput("");
                setDefaultArtist("");
                router.refresh();
              },
            );
          }}
        >
          <div className="grid gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)]">
            <label className="block">
              <span className={ADMIN_LABEL}>
                채널 주소 · @핸들 · 채널 ID(UC…)
              </span>
              <input
                className={ADMIN_INPUT}
                value={input}
                maxLength={200}
                disabled={pending}
                placeholder="https://www.youtube.com/@handle"
                onChange={(event) => setInput(event.target.value)}
              />
            </label>
            <label className="block">
              <span className={ADMIN_LABEL}>종류</span>
              <select
                className={ADMIN_INPUT}
                value={kind}
                disabled={pending}
                onChange={(event) => setKind(event.target.value as ChannelKind)}
              >
                {CHANNEL_KINDS.map((item) => (
                  <option key={item} value={item} className="text-black">
                    {CHANNEL_KIND_LABELS[item]}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className={ADMIN_LABEL}>
                대표 아티스트{kind === "artist" ? " (필수)" : ""}
              </span>
              <input
                className={ADMIN_INPUT}
                value={kind === "topic" ? "" : defaultArtist}
                maxLength={200}
                disabled={pending || kind === "topic"}
                placeholder={kind === "topic" ? "채널명에서 자동" : ""}
                onChange={(event) => setDefaultArtist(event.target.value)}
              />
            </label>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              className={ADMIN_BUTTON_PRIMARY}
              disabled={pending || input.trim() === ""}
            >
              {pending ? "확인 중…" : "추가"}
            </button>
            <span role="status" aria-live="polite" className="text-sm">
              {notice && notice.message && (
                <span
                  className={notice.ok ? "text-emerald-300" : "text-red-300"}
                >
                  {notice.message}
                </span>
              )}
            </span>
          </div>
        </form>
      )}
    </>
  );
}
