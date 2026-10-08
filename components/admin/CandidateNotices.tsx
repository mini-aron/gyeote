"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { confirmDistinctSong, linkVideoToSong, promoteAlternateVideo } from "@/lib/admin/actions";
import { STATUS_LABELS } from "@/lib/admin/candidateInput";
import { candidateHref, type AdminTabKey } from "@/lib/admin/tabs";
import type { CandidateDetail, LinkedSong, SiblingCandidate } from "@/lib/admin/types";
import { ADMIN_BUTTON, ADMIN_CARD } from "./adminStyles";
import { useAdminAction } from "./useAdminAction";

const REPRESENTATIVE_STATUSES = ["new", "parsed", "tagged"];
const PROMOTING_STATUSES = [...REPRESENTATIVE_STATUSES, "rejected"];
const DISTINCT_STATUSES = [...REPRESENTATIVE_STATUSES, "needs_video"];
const LINK_FROM_SUSPECT_STATUSES = ["parsed", "tagged"];

function SongSummary({ song }: { song: LinkedSong }) {
  return (
    <p className="text-sm text-[#f4f1ff]">
      <strong className="font-medium">{song.title}</strong>
      <span className="text-[#f4f1ff]/70"> · {song.artist}</span>
      <span className="ml-2 text-xs text-[#f4f1ff]/50">
        {song.youtubeVideoId ? "영상 연결됨" : "영상 없음"}
        {!song.isActive && " · 비활성"}
      </span>
    </p>
  );
}

function SiblingRow({
  sibling,
  tab,
  action,
}: {
  sibling: SiblingCandidate;
  tab: AdminTabKey | null;
  action: ReactNode;
}) {
  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2 text-sm">
      <Link
        href={candidateHref(sibling.id, tab)}
        prefetch={false}
        className="underline underline-offset-2 hover:text-[#ffd9a8]"
      >
        {STATUS_LABELS[sibling.status]}
      </Link>
      {sibling.videoKind && <span className="text-xs text-[#f4f1ff]/50">{sibling.videoKind}</span>}
      {sibling.channelName && <span className="text-xs text-[#f4f1ff]/60">{sibling.channelName}</span>}
      {sibling.embeddable === false && <span className="text-xs text-red-300">퍼가기 불가</span>}
      <span className="ml-auto">{action}</span>
    </li>
  );
}

export function CandidateNotices({
  detail,
  tab,
  nextHref,
}: {
  detail: CandidateDetail;
  tab: AdminTabKey | null;
  nextHref: string;
}) {
  const router = useRouter();
  const { pending, notice, run } = useAdminAction();

  const isLooseDuplicate = detail.status === "duplicate" && detail.linkedSong === null;
  const representative = isLooseDuplicate
    ? detail.siblings.find((sibling) => REPRESENTATIVE_STATUSES.includes(sibling.status))
    : undefined;
  const linkTarget = detail.possibleDuplicate ?? (detail.status === "duplicate" ? detail.linkedSong : null);
  const canLink = linkTarget !== null && !(detail.status === "duplicate" && detail.reviewed);
  const canPromoteOthers = PROMOTING_STATUSES.includes(detail.status);
  const canResolveSuspect = DISTINCT_STATUSES.includes(detail.status);
  const canLinkSuspect = LINK_FROM_SUSPECT_STATUSES.includes(detail.status) && detail.embeddable === true;

  function link(song: LinkedSong) {
    const replace = song.youtubeVideoId !== null;
    if (replace && !window.confirm("이 곡에 이미 연결된 영상을 이 영상으로 바꿀까요?")) return;
    run(() => linkVideoToSong({ candidateId: detail.id, songId: song.id, replace }), () => router.replace(nextHref), true);
  }

  const hasContent =
    detail.possibleDuplicate ||
    detail.linkedSong ||
    detail.previouslyRejected ||
    detail.siblings.length > 0 ||
    representative;
  if (!hasContent) return null;

  return (
    <div className="space-y-3">
      {detail.possibleDuplicate && (
        <div className="rounded-xl border border-amber-300/40 bg-amber-300/10 p-4">
          <p className="mb-2 text-sm font-medium text-amber-100">이미 있는 곡과 비슷해요</p>
          <SongSummary song={detail.possibleDuplicate} />
          {canResolveSuspect && (
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                className={ADMIN_BUTTON}
                disabled={pending}
                onClick={() =>
                  run(
                    () => confirmDistinctSong({ candidateId: detail.id, songId: detail.possibleDuplicate!.id }),
                    () => router.refresh(),
                  )
                }
              >
                별개 곡이에요
              </button>
              {canLinkSuspect && (
                <button
                  type="button"
                  className={ADMIN_BUTTON}
                  disabled={pending}
                  onClick={() => link(detail.possibleDuplicate!)}
                >
                  {detail.possibleDuplicate.youtubeVideoId ? "같은 곡 → 영상 교체" : "같은 곡 → 이 영상 연결"}
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {detail.linkedSong && (
        <div className="rounded-xl border border-sky-300/30 bg-sky-300/10 p-4">
          <p className="mb-2 text-sm font-medium text-sky-100">
            {detail.reviewed ? "이미 있는 곡의 같은 영상으로 처리됨" : "이미 있는 곡과 같은 곡이에요"}
          </p>
          <SongSummary song={detail.linkedSong} />
          {canLink && detail.linkedSong && (
            <div className="mt-3">
              <button
                type="button"
                className={ADMIN_BUTTON}
                disabled={pending || detail.embeddable !== true}
                onClick={() => link(detail.linkedSong!)}
              >
                {detail.linkedSong.youtubeVideoId ? "영상 교체" : "이 영상 연결"}
              </button>
            </div>
          )}
        </div>
      )}

      {detail.previouslyRejected && (
        <p className="rounded-xl border border-white/15 bg-white/5 p-3 text-sm text-[#f4f1ff]/80">
          이전에 거절된 같은 곡이 있어요.
        </p>
      )}

      {representative && (
        <div className={`${ADMIN_CARD} p-4`}>
          <p className="mb-2 text-sm font-medium">같은 곡의 대표 후보가 따로 있어요</p>
          <ul className="divide-y divide-white/10">
            <SiblingRow
              sibling={representative}
              tab={tab}
              action={
                <button
                  type="button"
                  className={ADMIN_BUTTON}
                  disabled={pending || detail.embeddable !== true}
                  onClick={() =>
                    run(
                      () => promoteAlternateVideo({ currentId: representative.id, alternateId: detail.id }),
                      () => router.refresh(),
                    )
                  }
                >
                  이 영상을 대표로
                </button>
              }
            />
          </ul>
        </div>
      )}

      {detail.siblings.length > 0 && !representative && (
        <div className={`${ADMIN_CARD} p-4`}>
          <p className="mb-1 text-sm font-medium">같은 곡 다른 영상 {detail.siblings.length}개</p>
          <ul className="divide-y divide-white/10">
            {detail.siblings.map((sibling) => (
              <SiblingRow
                key={sibling.id}
                sibling={sibling}
                tab={tab}
                action={
                  canPromoteOthers && sibling.status === "duplicate" && sibling.songId === null ? (
                    <button
                      type="button"
                      className={ADMIN_BUTTON}
                      disabled={pending || sibling.embeddable !== true}
                      onClick={() =>
                        run(
                          () => promoteAlternateVideo({ currentId: detail.id, alternateId: sibling.id }),
                          () => router.replace(candidateHref(sibling.id, tab)),
                          true,
                        )
                      }
                    >
                      이 영상을 대표로
                    </button>
                  ) : null
                }
              />
            ))}
          </ul>
        </div>
      )}

      <div role="status" aria-live="polite" className="min-h-5 text-sm">
        {notice && notice.message && (
          <span className={notice.ok ? "text-emerald-300" : "text-red-300"}>{notice.message}</span>
        )}
      </div>
    </div>
  );
}
