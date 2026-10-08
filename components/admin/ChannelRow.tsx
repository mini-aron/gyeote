"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { updateChannel } from "@/lib/admin/actions";
import { CHANNEL_KINDS, CHANNEL_KIND_LABELS, type ChannelKind } from "@/lib/admin/candidateInput";
import { CHANNEL_STATE_LABELS, getChannelState, type ChannelState } from "@/lib/admin/channelState";
import type { ChannelListItem } from "@/lib/admin/types";
import { ADMIN_BADGE, ADMIN_BUTTON, ADMIN_BUTTON_PRIMARY, ADMIN_INPUT, ADMIN_LABEL } from "./adminStyles";
import { useAdminAction } from "./useAdminAction";

const STATE_BADGE: Record<ChannelState, string> = {
  tracking: "border-emerald-300/40 bg-emerald-300/10 text-emerald-200",
  stopped: "border-white/25 bg-white/10 text-[#f4f1ff]/80",
  failed: "border-orange-300/50 bg-orange-400/15 text-orange-200",
};

const CELL = "px-4 py-3 align-top";

export function ChannelRow({ channel }: { channel: ChannelListItem }) {
  const router = useRouter();
  const { pending, notice, run } = useAdminAction();
  const [editing, setEditing] = useState(false);
  const [status, setStatus] = useState(channel.status);
  const [kind, setKind] = useState<ChannelKind>(channel.kind);
  const [defaultArtist, setDefaultArtist] = useState(channel.defaultArtist ?? "");
  const state = getChannelState(channel);

  function cancel() {
    setStatus(channel.status);
    setKind(channel.kind);
    setDefaultArtist(channel.defaultArtist ?? "");
    setEditing(false);
  }

  return (
    <>
      <tr className={`border-t border-white/10 ${state === "failed" ? "bg-orange-400/[0.06]" : ""}`}>
        <td className={`${CELL} min-w-56`}>
          <a
            href={`https://www.youtube.com/channel/${channel.youtubeChannelId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-[#f4f1ff] underline-offset-2 hover:text-[#ffd9a8] hover:underline"
          >
            {channel.name}
          </a>
          {channel.defaultArtist && <p className="mt-0.5 text-xs text-[#f4f1ff]/75">{channel.defaultArtist}</p>}
          {state === "failed" && channel.lastError && (
            <details className="mt-1.5">
              <summary className="cursor-pointer text-xs text-orange-200">
                연속 실패 {channel.failCount}회 · 오류 보기
              </summary>
              <p className="mt-1 max-w-md break-words text-xs text-orange-100/90">{channel.lastError}</p>
            </details>
          )}
        </td>
        <td className={`${CELL} whitespace-nowrap`}>
          <span className={`${ADMIN_BADGE} border-white/25 text-[#f4f1ff]/85`}>{CHANNEL_KIND_LABELS[channel.kind]}</span>
        </td>
        <td className={`${CELL} whitespace-nowrap`}>
          <span className={`${ADMIN_BADGE} ${STATE_BADGE[state]}`} title={channel.lastError ?? undefined}>
            {CHANNEL_STATE_LABELS[state]}
          </span>
        </td>
        <td className={`${CELL} whitespace-nowrap text-right text-sm tabular-nums`}>{channel.candidateCount}</td>
        <td className={`${CELL} whitespace-nowrap text-right text-sm tabular-nums`}>{channel.approvedCount}</td>
        <td className={`${CELL} whitespace-nowrap text-sm text-[#f4f1ff]/80`}>{channel.lastCheckedLabel}</td>
        <td className={`${CELL} whitespace-nowrap text-right`}>
          <button
            type="button"
            className="rounded-md border border-white/20 px-3 py-1 text-xs text-[#f4f1ff] hover:bg-white/10"
            aria-expanded={editing}
            onClick={() => (editing ? cancel() : setEditing(true))}
          >
            {editing ? "닫기" : "편집"}
          </button>
        </td>
      </tr>
      {editing && (
        <tr className="bg-white/[0.04]">
          <td colSpan={7} className="px-4 py-4">
            <div className="grid gap-3 md:grid-cols-[10rem_10rem_minmax(0,1fr)_auto] md:items-end">
              <label className="block">
                <span className={ADMIN_LABEL}>상태</span>
                <select
                  className={ADMIN_INPUT}
                  value={status}
                  disabled={pending}
                  onChange={(event) => setStatus(event.target.value as ChannelListItem["status"])}
                >
                  <option value="tracking" className="text-black">수집 중</option>
                  <option value="ignored" className="text-black">중지</option>
                </select>
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
                <span className={ADMIN_LABEL}>대표 아티스트</span>
                <input
                  className={ADMIN_INPUT}
                  value={kind === "topic" ? "" : defaultArtist}
                  maxLength={200}
                  disabled={pending || kind === "topic"}
                  placeholder={kind === "topic" ? "채널명에서 자동" : ""}
                  onChange={(event) => setDefaultArtist(event.target.value)}
                />
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  className={ADMIN_BUTTON_PRIMARY}
                  disabled={pending}
                  onClick={() =>
                    run(
                      () => updateChannel({ id: channel.id, status, kind, defaultArtist }),
                      () => {
                        setEditing(false);
                        router.refresh();
                      },
                    )
                  }
                >
                  저장
                </button>
                <button type="button" className={ADMIN_BUTTON} disabled={pending} onClick={cancel}>
                  취소
                </button>
              </div>
            </div>
            <div role="status" aria-live="polite" className="mt-2 min-h-4 text-xs">
              {notice && notice.message && (
                <span className={notice.ok ? "text-emerald-300" : "text-red-300"}>{notice.message}</span>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
