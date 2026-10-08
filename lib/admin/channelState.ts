import type { ChannelListItem } from "./types";

export type ChannelState = "failed" | "tracking" | "stopped";

export const CHANNEL_STATE_LABELS: Record<ChannelState, string> = {
  failed: "실패",
  tracking: "수집 중",
  stopped: "중지",
};

const STATE_ORDER: Record<ChannelState, number> = { failed: 0, tracking: 1, stopped: 2 };

export function getChannelState(channel: Pick<ChannelListItem, "status" | "failCount">): ChannelState {
  if (channel.status === "ignored") return "stopped";
  return channel.failCount >= 1 ? "failed" : "tracking";
}

export function sortChannels(channels: ChannelListItem[]): ChannelListItem[] {
  return [...channels].sort(
    (a, b) =>
      STATE_ORDER[getChannelState(a)] - STATE_ORDER[getChannelState(b)] || a.name.localeCompare(b.name, "ko"),
  );
}
