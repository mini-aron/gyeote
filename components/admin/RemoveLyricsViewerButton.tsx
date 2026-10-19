"use client";

import { useRouter } from "next/navigation";
import { removeLyricsViewer } from "@/lib/admin/lyricsActions";
import { ADMIN_BUTTON } from "./adminStyles";
import { useAdminAction } from "./useAdminAction";

export function RemoveLyricsViewerButton({ userId }: { userId: string }) {
  const router = useRouter();
  const { pending, notice, run } = useAdminAction();
  return (
    <div className="flex items-center justify-end gap-2">
      {notice && !notice.ok && <span className="text-xs text-red-300">{notice.message}</span>}
      <button
        type="button"
        className={ADMIN_BUTTON}
        disabled={pending}
        onClick={() => run(() => removeLyricsViewer(userId), () => router.refresh())}
      >
        해제
      </button>
    </div>
  );
}
