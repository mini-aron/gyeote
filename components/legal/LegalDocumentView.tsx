"use client";

import Link from "next/link";
import { useEffect } from "react";
import { GLASS_CARD } from "@/components/glassCard";
import type { LegalDocument } from "@/lib/legal/legalDocuments";
import { useWorld } from "@/lib/world/WorldContext";

const OTHER_DOCUMENT = {
  "/privacy": { href: "/terms", label: "이용약관" },
  "/terms": { href: "/privacy", label: "개인정보 처리방침" },
} as const;

export function LegalDocumentView({ content, path }: { content: LegalDocument; path: keyof typeof OTHER_DOCUMENT }) {
  const { flyTo } = useWorld();
  const other = OTHER_DOCUMENT[path];

  useEffect(() => {
    flyTo("sky");
  }, [flyTo]);

  return (
    <main className="pointer-events-none flex min-h-dvh flex-1 flex-col justify-end px-4 pb-[calc(96px+env(safe-area-inset-bottom,0px))] pt-16 text-[#f4f1ff]">
      <article
        className={`${GLASS_CARD} pointer-events-auto mx-auto flex max-h-[calc(100dvh-10rem)] w-full max-w-md flex-col gap-5 overflow-y-auto px-5 py-5`}
      >
        <header className="flex flex-col gap-1">
          <h1 className="font-serif-kr text-xl font-semibold">{content.title}</h1>
          <p className="text-xs text-[#f4f1ff]/55">시행일 {content.effectiveDate}</p>
        </header>
        <p className="text-sm leading-relaxed text-[#f4f1ff]/80">{content.intro}</p>

        {content.sections.map((section) => (
          <section key={section.heading} className="flex flex-col gap-2">
            <h2 className="text-sm font-medium">{section.heading}</h2>
            {section.blocks.map((block, index) =>
              typeof block === "string" ? (
                <p key={index} className="text-xs leading-relaxed text-[#f4f1ff]/75">
                  {block}
                </p>
              ) : (
                <ul key={index} className="flex list-disc flex-col gap-1 pl-4 text-xs leading-relaxed text-[#f4f1ff]/75">
                  {block.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              ),
            )}
          </section>
        ))}

        <Link href={other.href} className="self-start text-xs text-[#f4f1ff]/60 underline underline-offset-2">
          {other.label} 보기
        </Link>
      </article>
    </main>
  );
}
