"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

interface BottomNavApi {
  hidden: boolean;
  acquireHide: () => () => void;
}

const BottomNavContext = createContext<BottomNavApi | null>(null);

export function BottomNavProvider({ children }: { children: ReactNode }) {
  const [hideCount, setHideCount] = useState(0);

  const acquireHide = useCallback(() => {
    setHideCount((count) => count + 1);
    return () => setHideCount((count) => count - 1);
  }, []);

  const api = useMemo(() => ({ hidden: hideCount > 0, acquireHide }), [hideCount, acquireHide]);
  return <BottomNavContext.Provider value={api}>{children}</BottomNavContext.Provider>;
}

export function useBottomNav(): BottomNavApi {
  const ctx = useContext(BottomNavContext);
  if (!ctx) throw new Error("useBottomNav must be used within a BottomNavProvider");
  return ctx;
}

export function useBottomNavHidden(hidden: boolean) {
  const { acquireHide } = useBottomNav();
  useEffect(() => {
    if (!hidden) return;
    return acquireHide();
  }, [hidden, acquireHide]);
}
