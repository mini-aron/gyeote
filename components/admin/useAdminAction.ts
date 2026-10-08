"use client";

import { useCallback, useRef, useState, useTransition } from "react";
import type { AdminActionResult } from "@/lib/admin/types";

type Notice = { ok: boolean; message: string };

const REQUEST_FAILED = "요청에 실패했어요. 로그인 상태를 확인하고 다시 시도해 주세요.";

export function useAdminAction() {
  const [transitionPending, startTransition] = useTransition();
  const [locked, setLocked] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const busy = useRef(false);

  // lockOnSuccess: 성공 뒤 화면 이동이 끝나기 전에 같은 버튼이 다시 눌리지 않게 잠가 둔다
  const run = useCallback(
    (action: () => Promise<AdminActionResult>, onOk?: () => void, lockOnSuccess = false) => {
      if (busy.current) return;
      busy.current = true;
      setNotice(null);
      startTransition(async () => {
        let keepBusy = false;
        try {
          const result = await action();
          setNotice({ ok: result.ok, message: result.message ?? "" });
          if (result.ok) {
            onOk?.();
            keepBusy = lockOnSuccess;
          }
        } catch {
          setNotice({ ok: false, message: REQUEST_FAILED });
        } finally {
          if (keepBusy) setLocked(true);
          else busy.current = false;
        }
      });
    },
    [],
  );

  return { pending: transitionPending || locked, notice, run };
}
