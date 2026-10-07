export function SkeletonBlock({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`bg-white/[0.08] motion-safe:animate-pulse ${className ?? "rounded-md"}`}
    />
  );
}
