"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { addLyricsViewer } from "@/lib/admin/lyricsActions";
import { ADMIN_BUTTON_PRIMARY, ADMIN_CARD, ADMIN_INPUT, ADMIN_LABEL } from "./adminStyles";
import { useAdminAction } from "./useAdminAction";

export function LyricsViewerForm() {
  const router = useRouter();
  const { pending, notice, run } = useAdminAction();
  const [email, setEmail] = useState("");

  return (
    <form
      className={`${ADMIN_CARD} flex flex-wrap items-end gap-3 p-4`}
      onSubmit={(event) => {
        event.preventDefault();
        run(
          () => addLyricsViewer(email),
          () => {
            setEmail("");
            router.refresh();
          },
        );
      }}
    >
      <label className="block min-w-64 flex-1">
        <span className={ADMIN_LABEL}>가입한 회원 이메일</span>
        <input
          type="email"
          className={ADMIN_INPUT}
          value={email}
          maxLength={254}
          disabled={pending}
          placeholder="member@example.com"
          onChange={(event) => setEmail(event.target.value)}
        />
      </label>
      <button type="submit" className={ADMIN_BUTTON_PRIMARY} disabled={pending || email.trim() === ""}>
        {pending ? "확인 중…" : "열람자 추가"}
      </button>
      <span role="status" aria-live="polite" className="basis-full text-sm">
        {notice && notice.message && (
          <span className={notice.ok ? "text-emerald-300" : "text-red-300"}>{notice.message}</span>
        )}
      </span>
    </form>
  );
}
