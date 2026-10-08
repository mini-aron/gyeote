"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  approveCandidate,
  rejectCandidate,
  restoreCandidate,
  saveCandidate,
} from "@/lib/admin/actions";
import {
  EDITABLE_STATUSES,
  REJECT_REASONS,
  REJECT_REASON_LABELS,
  REJECTABLE_STATUSES,
  STATUS_LABELS,
  hasRequiredTags,
  type EditableStatus,
  type RejectableStatus,
} from "@/lib/admin/candidateInput";
import type { CandidateDetail, CandidateTags, TagCatalog } from "@/lib/admin/types";
import { ADMIN_BADGE, ADMIN_BUTTON, ADMIN_BUTTON_PRIMARY, ADMIN_CARD, ADMIN_INPUT, ADMIN_LABEL } from "./adminStyles";
import { TagPicker } from "./TagPicker";
import { useAdminAction } from "./useAdminAction";

function isEditable(status: string): status is EditableStatus {
  return (EDITABLE_STATUSES as readonly string[]).includes(status);
}

function isRejectable(status: string): status is RejectableStatus {
  return (REJECTABLE_STATUSES as readonly string[]).includes(status);
}

export function CandidateEditor({
  detail,
  catalog,
  nextHref,
  hasNext,
}: {
  detail: CandidateDetail;
  catalog: TagCatalog;
  nextHref: string;
  hasNext: boolean;
}) {
  const router = useRouter();
  const { pending, notice, run } = useAdminAction();
  const [title, setTitle] = useState(detail.title ?? "");
  const [artist, setArtist] = useState(detail.artist ?? "");
  const [memo, setMemo] = useState(detail.adminMemo ?? "");
  const [tags, setTags] = useState<CandidateTags>(detail.tags);
  const [rejectOpen, setRejectOpen] = useState(false);

  const status = detail.status;
  const editable = isEditable(status);
  const draft = { id: detail.id, expectedStatus: status, title, artist, tags, memo };
  const canApprove =
    editable &&
    title.trim() !== "" &&
    artist.trim() !== "" &&
    hasRequiredTags(tags) &&
    detail.youtubeVideoId !== null &&
    detail.embeddable === true &&
    detail.possibleDuplicate === null;

  const approveHint = !editable
    ? null
    : detail.embeddable !== true
      ? "퍼가기가 허용된 영상이 있어야 승인할 수 있어요."
      : detail.possibleDuplicate
        ? "중복 의심을 먼저 해결해 주세요."
        : !hasRequiredTags(tags)
          ? "주제와 분위기를 1개 이상 골라 주세요."
          : null;

  function go(href: string) {
    router.replace(href);
  }

  return (
    <>
      <section className={`${ADMIN_CARD} space-y-5 p-4 md:p-5`}>
        <div className="flex flex-wrap items-center gap-2">
          <span className={`${ADMIN_BADGE} border-white/20 text-[#f4f1ff]/80`}>{STATUS_LABELS[status]}</span>
          {detail.channelName && <span className="text-xs text-[#f4f1ff]/60">{detail.channelName}</span>}
          {detail.videoKind && <span className="text-xs text-[#f4f1ff]/40">{detail.videoKind}</span>}
          {detail.aiAttempts >= 3 && (
            <span className={`${ADMIN_BADGE} border-amber-300/40 text-amber-200`}>AI {detail.aiAttempts}회 실패</span>
          )}
        </div>

        {detail.rawTitle && (
          <div>
            <span className={ADMIN_LABEL}>유튜브 원제목</span>
            <p className="break-words text-sm text-[#f4f1ff]/85">{detail.rawTitle}</p>
          </div>
        )}
        {status === "rejected" && (
          <p className="text-sm text-[#f4f1ff]/70">
            거절 사유: {detail.rejectReason ? (REJECT_REASON_LABELS[detail.rejectReason] ?? detail.rejectReason) : "-"}
          </p>
        )}
        {detail.lastError && <p className="break-words text-xs text-amber-200/80">최근 오류: {detail.lastError}</p>}

        <div className="grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className={ADMIN_LABEL}>곡명</span>
            <input
              className={ADMIN_INPUT}
              value={title}
              maxLength={200}
              disabled={!editable || pending}
              onChange={(event) => setTitle(event.target.value)}
            />
          </label>
          <label className="block">
            <span className={ADMIN_LABEL}>아티스트</span>
            <input
              className={ADMIN_INPUT}
              value={artist}
              maxLength={200}
              disabled={!editable || pending}
              onChange={(event) => setArtist(event.target.value)}
            />
          </label>
        </div>

        <TagPicker catalog={catalog} value={tags} disabled={!editable || pending} onChange={setTags} />

        <label className="block">
          <span className={ADMIN_LABEL}>메모 (AI 요약 입력으로 쓰여요)</span>
          <textarea
            className={`${ADMIN_INPUT} min-h-20 resize-y`}
            value={memo}
            maxLength={1000}
            disabled={!editable || pending}
            onChange={(event) => setMemo(event.target.value)}
          />
        </label>
      </section>

      <div className="pointer-events-auto fixed inset-x-0 bottom-0 z-20 border-t border-white/10 bg-[#0d1030]/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-2 px-4 py-3">
          {editable && (
            <>
              <button
                type="button"
                className={ADMIN_BUTTON_PRIMARY}
                disabled={pending || !canApprove}
                onClick={() => run(() => approveCandidate(draft), () => go(nextHref), true)}
              >
                승인하고 다음
              </button>
              <button
                type="button"
                className={ADMIN_BUTTON}
                disabled={pending || title.trim() === "" || artist.trim() === ""}
                onClick={() => run(() => saveCandidate(draft), () => router.refresh())}
              >
                저장
              </button>
            </>
          )}
          {status === "rejected" && (
            <button
              type="button"
              className={ADMIN_BUTTON_PRIMARY}
              disabled={pending}
              onClick={() => run(() => restoreCandidate(detail.id), () => router.refresh())}
            >
              복원
            </button>
          )}
          <Link href={nextHref} prefetch={false} className={ADMIN_BUTTON} aria-disabled={pending}>
            {hasNext ? "건너뛰기" : "목록으로"}
          </Link>
          <div role="status" aria-live="polite" className="min-w-0 flex-1 basis-60 text-sm">
            {notice && notice.message && (
              <span className={notice.ok ? "text-emerald-300" : "text-red-300"}>{notice.message}</span>
            )}
            {!notice && approveHint && <span className="text-[#f4f1ff]/50">{approveHint}</span>}
          </div>
          {isRejectable(status) && (
            <div className="relative">
              <button
                type="button"
                className={ADMIN_BUTTON}
                aria-expanded={rejectOpen}
                disabled={pending}
                onClick={() => setRejectOpen((open) => !open)}
              >
                거절 ▾
              </button>
              {rejectOpen && (
                <div className="absolute bottom-full right-0 mb-2 w-40 overflow-hidden rounded-lg border border-white/15 bg-[#161a45] shadow-lg">
                  {REJECT_REASONS.map((reason) => (
                    <button
                      key={reason.key}
                      type="button"
                      className="block w-full px-3 py-2 text-left text-sm hover:bg-white/10"
                      onClick={() => {
                        setRejectOpen(false);
                        run(
                          () => rejectCandidate({ id: detail.id, expectedStatus: status, reason: reason.key }),
                          () => go(nextHref),
                          true,
                        );
                      }}
                    >
                      {reason.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
