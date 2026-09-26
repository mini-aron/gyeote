"use client";

import { createContext, useCallback, useContext, useMemo, useRef, type ReactNode } from "react";
import type { WorldScene } from "./WorldScene";
import type { MoodKey } from "./moods";
import type { StationKey } from "./stations";

interface WorldApi {
  flyTo: (station: StationKey, durationMs?: number) => void;
  setMood: (mood: MoodKey) => void;
  /** Internal: called by WorldBackground to attach/detach the live scene instance. */
  registerScene: (scene: WorldScene | null) => void;
}

const WorldContext = createContext<WorldApi | null>(null);

export function WorldProvider({ children }: { children: ReactNode }) {
  const sceneRef = useRef<WorldScene | null>(null);
  // WorldBackground mounts asynchronously (dynamic import, no SSR), so a page's
  // own mount effect can easily call flyTo/setMood before the scene exists.
  // Track the last-requested station/mood (never cleared) and re-apply it to
  // whichever scene registers — this also makes re-registration safe under
  // React Strict Mode's dev-only mount→cleanup→mount cycle, where the scene
  // that receives a request can be a throwaway instance disposed a moment
  // later; a "consume once" pending queue would miss the real, persisting one.
  const lastStationRef = useRef<StationKey | null>(null);
  const lastMoodRef = useRef<MoodKey | null>(null);

  const flyTo = useCallback((station: StationKey, durationMs?: number) => {
    lastStationRef.current = station;
    sceneRef.current?.flyTo(station, durationMs);
  }, []);

  const setMood = useCallback((mood: MoodKey) => {
    lastMoodRef.current = mood;
    sceneRef.current?.setMood(mood);
  }, []);

  const registerScene = useCallback((scene: WorldScene | null) => {
    sceneRef.current = scene;
    if (!scene) return;
    // Snap instantly (no flight) — this scene just mounted, there's nothing to fly from.
    if (lastStationRef.current) scene.flyTo(lastStationRef.current, 0);
    if (lastMoodRef.current) scene.setMood(lastMoodRef.current);
  }, []);

  const api = useMemo(() => ({ flyTo, setMood, registerScene }), [flyTo, setMood, registerScene]);

  return <WorldContext.Provider value={api}>{children}</WorldContext.Provider>;
}

export function useWorld(): WorldApi {
  const ctx = useContext(WorldContext);
  if (!ctx) throw new Error("useWorld must be used within a WorldProvider");
  return ctx;
}
