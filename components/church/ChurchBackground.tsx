"use client";

import { useEffect, useRef } from "react";
import { ChurchScene } from "@/lib/church/ChurchScene";
import type { MoodKey } from "@/lib/church/moods";

export function ChurchBackground({ mood }: { mood: MoodKey }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<ChurchScene | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const scene = new ChurchScene(canvas);
    sceneRef.current = scene;

    return () => {
      scene.dispose();
      sceneRef.current = null;
    };
  }, []);

  useEffect(() => {
    sceneRef.current?.setMood(mood);
  }, [mood]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="absolute inset-0 h-full w-full touch-none"
    />
  );
}
