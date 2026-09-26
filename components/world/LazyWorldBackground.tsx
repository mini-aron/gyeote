"use client";

import dynamic from "next/dynamic";

// next/dynamic(..., { ssr: false }) can only be called from a Client Component,
// so this thin wrapper is what app/layout.tsx (a Server Component) imports.
export const LazyWorldBackground = dynamic(
  () => import("./WorldBackground").then((m) => m.WorldBackground),
  { ssr: false },
);
