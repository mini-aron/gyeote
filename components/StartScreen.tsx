"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useWorld } from "@/lib/world/WorldContext";
import { getGreeting } from "@/lib/greeting";
import {
  checkAndRecordVisit,
  recordEntry,
  type EntryChoice,
} from "@/lib/visit";

export function StartScreen() {
  const [greeting, setGreeting] = useState<string | null>(null);
  const hasRecordedVisit = useRef(false);
  const { flyTo } = useWorld();

  useEffect(() => {
    flyTo("sky");
  }, [flyTo]);

  useEffect(() => {
    // Guard against React Strict Mode's double effect invocation in dev:
    // checkAndRecordVisit() is a one-time read-then-write, so running it twice
    // would read back the value the first call just wrote and report "returning".
    if (hasRecordedVisit.current) return;
    hasRecordedVisit.current = true;

    const isReturning = checkAndRecordVisit();
    // Must run after mount: Date/localStorage differ between server and client,
    // so computing this during render would cause a hydration mismatch.
    setGreeting(getGreeting(new Date(), isReturning));
  }, []);

  return (
    <div className="pointer-events-none flex min-h-dvh flex-col items-center justify-center px-6 py-12 text-[#f4f1ff]">
      <div className="pointer-events-auto flex w-full max-w-sm flex-col items-center gap-10 text-center">
        <div className="flex flex-col items-center gap-3">
          <p className="text-xs tracking-[0.3em] text-[#f4f1ff]/50">GYEOTE</p>
          <h1 className="font-serif-kr text-3xl font-semibold">곁에</h1>
          <p className="min-h-6 text-sm text-[#f4f1ff]/70">{greeting ?? " "}</p>
          <p className="max-w-xs text-sm leading-relaxed text-[#f4f1ff]/50">
            짧게 대화하면, 지금 마음에 꼭 맞는
            <br />
            말씀 한 구절과 찬양 한 곡을 골라드려요
          </p>
        </div>

        <div className="flex w-full flex-col gap-4">
          <EntryCard
            href="/backyard"
            entry="backyard"
            icon="🌿"
            title="뒤뜰"
            subtitle="하고 싶은 말이 많은 날"
          />
          <EntryCard
            href="/church"
            entry="church"
            icon="⛪"
            title="교회"
            subtitle="가볍게 들렀어요"
          />
        </div>
      </div>
    </div>
  );
}

function EntryCard({
  href,
  entry,
  icon,
  title,
  subtitle,
}: {
  href: string;
  entry: EntryChoice;
  icon: string;
  title: string;
  subtitle: string;
}) {
  return (
    <Link
      href={href}
      onClick={() => recordEntry(entry)}
      className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.06] px-5 py-4 text-left backdrop-blur-md transition-colors hover:bg-white/[0.1]"
    >
      <span className="text-2xl" aria-hidden="true">
        {icon}
      </span>
      <span className="flex flex-col">
        <span className="text-base font-medium">{title}</span>
        <span className="text-sm text-[#f4f1ff]/60">{subtitle}</span>
      </span>
    </Link>
  );
}
