import { requireAdmin } from "@/lib/admin/requireAdmin";
import { getChannelList } from "@/lib/admin/getAdminData";
import { getChannelState, sortChannels } from "@/lib/admin/channelState";
import { ADMIN_CARD } from "@/components/admin/adminStyles";
import { ChannelForm } from "@/components/admin/ChannelForm";
import { ChannelTable } from "@/components/admin/ChannelTable";

function Stat({ label, value, tone }: { label: string; value: number; tone?: string }) {
  return (
    <div className="px-4 py-3">
      <p className="text-xs text-[#f4f1ff]/75">{label}</p>
      <p className={`mt-0.5 text-xl font-medium tabular-nums ${tone ?? "text-[#f4f1ff]"}`}>{value}</p>
    </div>
  );
}

export default async function Page() {
  await requireAdmin();
  const channels = sortChannels(await getChannelList());

  const states = channels.map(getChannelState);
  const failed = states.filter((state) => state === "failed").length;
  const tracking = states.filter((state) => state === "tracking").length;
  const stopped = states.filter((state) => state === "stopped").length;
  const candidates = channels.reduce((sum, channel) => sum + channel.candidateCount, 0);
  const approved = channels.reduce((sum, channel) => sum + channel.approvedCount, 0);

  return (
    <div className="space-y-5">
      <ChannelForm />
      <div
        className={`${ADMIN_CARD} grid grid-cols-3 divide-x divide-white/10 sm:grid-cols-6 ${
          failed > 0 ? "border-orange-300/50" : ""
        }`}
      >
        <Stat label="전체 채널" value={channels.length} />
        <Stat label="수집 중" value={tracking} tone="text-emerald-200" />
        <Stat label="중지" value={stopped} />
        <Stat label="실패" value={failed} tone={failed > 0 ? "text-orange-300" : undefined} />
        <Stat label="전체 후보" value={candidates} />
        <Stat label="승인" value={approved} tone="text-[#ffd9a8]" />
      </div>
      {channels.length === 0 ? (
        <p className={`${ADMIN_CARD} p-8 text-center text-sm text-[#f4f1ff]/80`}>등록된 채널이 없어요.</p>
      ) : (
        <ChannelTable channels={channels} />
      )}
    </div>
  );
}
