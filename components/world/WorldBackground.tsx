"use client";

import { useEffect, useRef } from "react";
import { WorldScene } from "@/lib/world/WorldScene";
import { useWorld } from "@/lib/world/WorldContext";

/**
 * The single persistent 3D canvas for the whole app. Mounted once from the
 * root layout so it survives route navigation — pages don't own a scene,
 * they just call useWorld().flyTo(station) to move the camera to their spot.
 */
export function WorldBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { registerScene } = useWorld();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const scene = new WorldScene(canvas);
    registerScene(scene);

    return () => {
      registerScene(null);
      scene.dispose();
    };
  }, [registerScene]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="fixed inset-x-0 top-0 h-lvh w-full touch-none"
    />
  );
}
