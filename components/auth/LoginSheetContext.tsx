"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

export interface LoginSheetOptions {
  next?: string;
  reason?: string;
}

interface LoginSheetApi {
  state: { next: string; reason: string | null } | null;
  open: (options?: LoginSheetOptions) => void;
  close: () => void;
}

const LoginSheetContext = createContext<LoginSheetApi | null>(null);

export function LoginSheetProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<LoginSheetApi["state"]>(null);

  const open = useCallback((options?: LoginSheetOptions) => {
    setState({ next: options?.next ?? "/", reason: options?.reason ?? null });
  }, []);
  const close = useCallback(() => setState(null), []);

  const api = useMemo(() => ({ state, open, close }), [state, open, close]);
  return <LoginSheetContext.Provider value={api}>{children}</LoginSheetContext.Provider>;
}

export function useLoginSheet(): LoginSheetApi {
  const ctx = useContext(LoginSheetContext);
  if (!ctx) throw new Error("useLoginSheet must be used within a LoginSheetProvider");
  return ctx;
}
