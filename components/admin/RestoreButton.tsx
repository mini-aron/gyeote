"use client";

import { useRouter } from "next/navigation";
import { restoreCandidate } from "@/lib/admin/actions";
import { ADMIN_BUTTON } from "./adminStyles";
import { useAdminAction } from "./useAdminAction";

export function RestoreButton({ id }: { id: string }) {
  const router = useRouter();
  const { pending, notice, run } = useAdminAction();
  return (
    <div className="flex items-center gap-2">
      {notice && !notice.ok && <span className="text-xs text-red-300">{notice.message}</span>}
      <button
        type="button"
        className={ADMIN_BUTTON}
        disabled={pending}
        onClick={() => run(() => restoreCandidate(id), () => router.refresh())}
      >
        복원
      </button>
    </div>
  );
}
