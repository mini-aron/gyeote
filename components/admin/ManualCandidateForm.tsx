"use client";

import Link from "next/link";
import { useState } from "react";
import { createManualCandidate } from "@/lib/admin/actions";
import { candidateHref } from "@/lib/admin/tabs";
import { ADMIN_BUTTON_PRIMARY, ADMIN_CARD, ADMIN_INPUT, ADMIN_LABEL } from "./adminStyles";
import { useAdminAction } from "./useAdminAction";

export function ManualCandidateForm() {
  const { pending, notice, run } = useAdminAction();
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [url, setUrl] = useState("");
  const [memo, setMemo] = useState("");
  const [linkedId, setLinkedId] = useState<string | null>(null);

  return (
    <form
      className={`${ADMIN_CARD} space-y-4 p-4 md:p-5`}
      onSubmit={(event) => {
        event.preventDefault();
        setLinkedId(null);
        run(async () => {
          const result = await createManualCandidate({ title, artist, url, memo });
          setLinkedId(result.candidateId ?? null);
          if (result.ok) {
            setTitle("");
            setArtist("");
            setUrl("");
            setMemo("");
          }
          return result;
        });
      }}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block">
          <span className={ADMIN_LABEL}>곡명</span>
          <input
            className={ADMIN_INPUT}
            value={title}
            maxLength={200}
            disabled={pending}
            onChange={(event) => setTitle(event.target.value)}
          />
        </label>
        <label className="block">
          <span className={ADMIN_LABEL}>아티스트</span>
          <input
            className={ADMIN_INPUT}
            value={artist}
            maxLength={200}
            disabled={pending}
            onChange={(event) => setArtist(event.target.value)}
          />
        </label>
      </div>
      <label className="block">
        <span className={ADMIN_LABEL}>유튜브 영상 주소 (없으면 비워 두세요)</span>
        <input
          className={ADMIN_INPUT}
          value={url}
          maxLength={300}
          disabled={pending}
          placeholder="https://www.youtube.com/watch?v=…"
          onChange={(event) => setUrl(event.target.value)}
        />
      </label>
      <label className="block">
        <span className={ADMIN_LABEL}>메모</span>
        <textarea
          className={`${ADMIN_INPUT} min-h-20 resize-y`}
          value={memo}
          maxLength={1000}
          disabled={pending}
          onChange={(event) => setMemo(event.target.value)}
        />
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          className={ADMIN_BUTTON_PRIMARY}
          disabled={pending || title.trim() === "" || artist.trim() === ""}
        >
          {pending ? "확인 중…" : "후보로 추가"}
        </button>
        <span role="status" aria-live="polite" className="text-sm">
          {notice && notice.message && (
            <span className={notice.ok ? "text-emerald-300" : "text-red-300"}>{notice.message}</span>
          )}
          {linkedId && (
            <Link href={candidateHref(linkedId, null)} prefetch={false} className="ml-2 underline underline-offset-2">
              후보 보기
            </Link>
          )}
        </span>
      </div>
    </form>
  );
}
