import Link from "next/link";
import { REJECT_REASON_LABELS } from "@/lib/admin/candidateInput";
import { ADMIN_TABS, LIST_PAGE_SIZE, candidateHref, listHref, type AdminTabKey } from "@/lib/admin/tabs";
import type { CandidateListItem } from "@/lib/admin/types";
import { ADMIN_BADGE, ADMIN_BUTTON, ADMIN_CARD } from "./adminStyles";
import { RestoreButton } from "./RestoreButton";

const MAX_AI_ATTEMPTS = 3;

function Badge({ tone, children }: { tone: "warn" | "muted"; children: string }) {
  const color = tone === "warn" ? "border-amber-300/40 text-amber-200" : "border-white/20 text-[#f4f1ff]/60";
  return <span className={`${ADMIN_BADGE} ${color}`}>{children}</span>;
}

function Row({ item, tab }: { item: CandidateListItem; tab: AdminTabKey }) {
  const named = item.title && item.artist;
  return (
    <li className="flex items-center gap-3 px-4 py-3 hover:bg-white/5">
      <Link href={candidateHref(item.id, tab)} prefetch={false} className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="truncate text-sm font-medium text-[#f4f1ff]">
            {named ? item.title : (item.rawTitle ?? "(제목 없음)")}
          </span>
          {named && <span className="truncate text-sm text-[#f4f1ff]/65">{item.artist}</span>}
          {item.hasPossibleDuplicate && <Badge tone="warn">중복 의심</Badge>}
          {item.previouslyRejected && <Badge tone="warn">이전에 거절됨</Badge>}
          {item.aiAttempts >= MAX_AI_ATTEMPTS && <Badge tone="warn">{`AI ${item.aiAttempts}회 실패`}</Badge>}
        </div>
        <div className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-[#f4f1ff]/45">
          {item.channelName && <span>{item.channelName}</span>}
          {item.videoKind && <span>{item.videoKind}</span>}
          {named && item.rawTitle && <span className="truncate">{item.rawTitle}</span>}
          {item.rejectReason && <span>{REJECT_REASON_LABELS[item.rejectReason] ?? item.rejectReason}</span>}
        </div>
      </Link>
      {tab === "rejected" && <RestoreButton id={item.id} />}
    </li>
  );
}

export function CandidateList({
  tab,
  page,
  counts,
  items,
  recommendableSongs,
}: {
  tab: AdminTabKey;
  page: number;
  counts: Record<AdminTabKey, number>;
  items: CandidateListItem[];
  recommendableSongs: number;
}) {
  const total = counts[tab];
  const lastPage = Math.max(1, Math.ceil(total / LIST_PAGE_SIZE));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h1 className="text-lg font-medium">후보 큐</h1>
        <p className="text-xs text-[#f4f1ff]/55">추천 대상 곡 {recommendableSongs}</p>
      </div>

      <nav className="flex flex-wrap gap-1.5" aria-label="후보 상태">
        {ADMIN_TABS.map((item) => (
          <Link
            key={item.key}
            href={listHref(item.key)}
            prefetch={false}
            aria-current={item.key === tab ? "page" : undefined}
            className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${
              item.key === tab
                ? "border-[#ffd9a8]/60 bg-[#ffd9a8]/15 text-[#ffd9a8]"
                : "border-white/15 text-[#f4f1ff]/70 hover:bg-white/10"
            }`}
          >
            {item.label} <span className="text-xs opacity-70">{counts[item.key]}</span>
          </Link>
        ))}
      </nav>

      {items.length === 0 ? (
        <p className={`${ADMIN_CARD} p-8 text-center text-sm text-[#f4f1ff]/55`}>이 상태의 후보가 없어요.</p>
      ) : (
        <ul className={`${ADMIN_CARD} divide-y divide-white/10`}>
          {items.map((item) => (
            <Row key={item.id} item={item} tab={tab} />
          ))}
        </ul>
      )}

      {lastPage > 1 && (
        <div className="flex items-center justify-center gap-3 text-sm">
          {page > 1 ? (
            <Link href={listHref(tab, page - 1)} prefetch={false} className={ADMIN_BUTTON}>
              이전
            </Link>
          ) : null}
          <span className="text-[#f4f1ff]/60">
            {page} / {lastPage}
          </span>
          {page < lastPage ? (
            <Link href={listHref(tab, page + 1)} prefetch={false} className={ADMIN_BUTTON}>
              다음
            </Link>
          ) : null}
        </div>
      )}
    </div>
  );
}
