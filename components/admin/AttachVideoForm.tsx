"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { attachVideo } from "@/lib/admin/actions";
import { candidateHref } from "@/lib/admin/tabs";
import { ADMIN_BUTTON_PRIMARY, ADMIN_CARD, ADMIN_INPUT, ADMIN_LABEL } from "./adminStyles";
import { useAdminAction } from "./useAdminAction";

// 성공하면 상태가 바뀌어 입력란은 사라지지만, 경고가 담긴 결과 메시지는 남겨 둔다
export function AttachVideoForm({ id, visible }: { id: string; visible: boolean }) {
  const router = useRouter();
  const { pending, notice, run } = useAdminAction();
  const [url, setUrl] = useState("");
  const [linkedId, setLinkedId] = useState<string | null>(null);

  const message = (
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
  );

  if (!visible) return notice?.ok ? <div>{message}</div> : null;

  return (
    <form
      className={`${ADMIN_CARD} space-y-3 p-4`}
      onSubmit={(event) => {
        event.preventDefault();
        setLinkedId(null);
        run(async () => {
          const result = await attachVideo({ id, url });
          setLinkedId(result.ok ? null : (result.candidateId ?? null));
          return result;
        }, () => router.refresh());
      }}
    >
      <label className="block">
        <span className={ADMIN_LABEL}>이 곡의 유튜브 영상 주소</span>
        <input
          className={ADMIN_INPUT}
          value={url}
          maxLength={300}
          disabled={pending}
          placeholder="https://www.youtube.com/watch?v=…"
          onChange={(event) => setUrl(event.target.value)}
        />
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" className={ADMIN_BUTTON_PRIMARY} disabled={pending || url.trim() === ""}>
          {pending ? "확인 중…" : "영상 붙이기"}
        </button>
        {message}
      </div>
    </form>
  );
}
