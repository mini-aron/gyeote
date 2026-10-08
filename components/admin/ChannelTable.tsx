"use client";

import { useState } from "react";
import { getChannelState, type ChannelState } from "@/lib/admin/channelState";
import type { ChannelListItem } from "@/lib/admin/types";
import { ADMIN_CARD } from "./adminStyles";
import { ChannelRow } from "./ChannelRow";

type Filter = "all" | ChannelState;

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "전체" },
  { key: "tracking", label: "수집 중" },
  { key: "stopped", label: "중지" },
  { key: "failed", label: "실패" },
];

const HEAD = "px-4 py-2.5 text-xs font-medium text-[#f4f1ff]/75";

export function ChannelTable({ channels }: { channels: ChannelListItem[] }) {
  const [filter, setFilter] = useState<Filter>("all");
  const visible = filter === "all" ? channels : channels.filter((channel) => getChannelState(channel) === filter);
  const countOf = (key: Filter) =>
    key === "all" ? channels.length : channels.filter((channel) => getChannelState(channel) === key).length;

  return (
    <div className="space-y-3">
      <div role="tablist" aria-label="상태 필터" className="flex flex-wrap gap-2">
        {FILTERS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={filter === key}
            className={`rounded-full border px-3 py-1 text-sm transition-colors ${
              filter === key
                ? "border-[#ffd9a8] bg-[#ffd9a8] text-[#1a1530]"
                : "border-white/20 text-[#f4f1ff] hover:bg-white/10"
            }`}
            onClick={() => setFilter(key)}
          >
            {label} {countOf(key)}
          </button>
        ))}
      </div>
      <div className={`${ADMIN_CARD} overflow-x-auto`}>
        <table className="w-full min-w-[56rem] text-left">
          <thead>
            <tr>
              <th className={HEAD}>채널</th>
              <th className={HEAD}>종류</th>
              <th className={HEAD}>상태</th>
              <th className={`${HEAD} text-right`}>후보</th>
              <th className={`${HEAD} text-right`}>승인</th>
              <th className={HEAD}>마지막 수집</th>
              <th className={HEAD}>
                <span className="sr-only">편집</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 ? (
              <tr className="border-t border-white/10">
                <td colSpan={7} className="px-4 py-8 text-center text-sm text-[#f4f1ff]/80">
                  해당하는 채널이 없어요.
                </td>
              </tr>
            ) : (
              visible.map((channel) => <ChannelRow key={channel.id} channel={channel} />)
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
