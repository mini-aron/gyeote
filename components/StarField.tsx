"use client";

import { useEffect, useRef } from "react";

export function StarField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    function draw() {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (!canvas || !ctx) return;

      const { innerWidth, innerHeight, devicePixelRatio } = window;
      const dpr = devicePixelRatio || 1;
      canvas.width = innerWidth * dpr;
      canvas.height = innerHeight * dpr;
      canvas.style.width = `${innerWidth}px`;
      canvas.style.height = `${innerHeight}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, innerWidth, innerHeight);

      const starCount = Math.floor((innerWidth * innerHeight) / 3500);
      for (let i = 0; i < starCount; i++) {
        const x = Math.random() * innerWidth;
        const y = Math.random() * innerHeight * 0.8;
        const r = Math.random() * 1.1 + 0.2;
        ctx.beginPath();
        ctx.fillStyle = `rgba(244, 241, 255, ${Math.random() * 0.6 + 0.2})`;
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    draw();
    window.addEventListener("resize", draw);
    return () => window.removeEventListener("resize", draw);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full"
    />
  );
}
