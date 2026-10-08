"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useBottomNavHidden } from "@/components/nav/BottomNavContext";

const NAV_ITEMS = [
  { href: "/admin", label: "후보 큐" },
  { href: "/admin/new", label: "직접 입력" },
  { href: "/admin/channels", label: "채널" },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/admin") return !pathname.startsWith("/admin/channels") && !pathname.startsWith("/admin/new");
  return pathname.startsWith(href);
}

export function AdminShell({ children }: { children: ReactNode }) {
  useBottomNavHidden(true);
  const pathname = usePathname();

  return (
    <div className="pointer-events-auto fixed inset-0 z-30 overflow-y-auto bg-[#0d1030] text-[#f4f1ff]">
      <header className="sticky top-0 z-10 border-b border-white/10 bg-[#0d1030]/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center gap-6 px-4 py-3">
          <span className="text-sm font-medium text-[#ffd9a8]">곁에 관리</span>
          <nav className="flex gap-1" aria-label="관리자 메뉴">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                prefetch={false}
                aria-current={isActive(pathname, item.href) ? "page" : undefined}
                className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${
                  isActive(pathname, item.href)
                    ? "bg-white/15 text-[#f4f1ff]"
                    : "text-[#f4f1ff]/60 hover:bg-white/10 hover:text-[#f4f1ff]"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl px-4 pb-32 pt-6">{children}</main>
    </div>
  );
}
