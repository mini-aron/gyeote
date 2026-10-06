"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { useLoginSheet } from "@/components/auth/LoginSheetContext";
import { useSessionStatus } from "@/components/auth/useSessionStatus";
import { useBottomNav } from "@/components/nav/BottomNavContext";

const KEYBOARD_SHRINK_RATIO = 0.75;
const LABEL_SHADOW = "[text-shadow:0_1px_6px_rgba(10,8,22,0.9)]";
const ICON_SHADOW = "drop-shadow-[0_1px_4px_rgba(10,8,22,0.9)]";

interface NavItem {
  href: string;
  label: string;
  icon: ReactNode;
}

const ICON_PROPS = {
  width: 24,
  height: 24,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
} as const;

const NAV_ITEMS: NavItem[] = [
  {
    href: "/",
    label: "홈",
    icon: (
      <svg {...ICON_PROPS}>
        <path d="M4 11.5 12 5l8 6.5" />
        <path d="M6 10.5V19h12v-8.5" />
      </svg>
    ),
  },
  {
    href: "/calendar",
    label: "캘린더",
    icon: (
      <svg {...ICON_PROPS}>
        <rect x="4" y="5.5" width="16" height="14" rx="2.5" />
        <path d="M4 10h16M8.5 3.5v4M15.5 3.5v4" />
      </svg>
    ),
  },
  {
    href: "/bookmarks",
    label: "북마크",
    icon: (
      <svg {...ICON_PROPS}>
        <path d="M7 4.5h10v15l-5-3.5-5 3.5z" />
      </svg>
    ),
  },
  {
    href: "/search",
    label: "검색",
    icon: (
      <svg {...ICON_PROPS}>
        <circle cx="11" cy="11" r="6" />
        <path d="m15.5 15.5 4 4" />
      </svg>
    ),
  },
  {
    href: "/me",
    label: "내정보",
    icon: (
      <svg {...ICON_PROPS}>
        <circle cx="12" cy="8.5" r="3.5" />
        <path d="M5 19.5c.8-3.2 3.6-5 7-5s6.2 1.8 7 5" />
      </svg>
    ),
  },
];

function LockBadge() {
  return (
    <span
      aria-hidden="true"
      className="absolute -right-2 -top-1 flex size-4 items-center justify-center rounded-full bg-[#ffd9a8] text-[#14102a] shadow-[0_1px_4px_rgba(10,8,22,0.6)]"
    >
      <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
        <path d="M7 10V8a5 5 0 0 1 10 0v2h1.5A1.5 1.5 0 0 1 20 11.5v8a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 19.5v-8A1.5 1.5 0 0 1 5.5 10zm2.5 0h5V8a2.5 2.5 0 0 0-5 0z" />
      </svg>
    </span>
  );
}

function useKeyboardOpen() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    const update = () => setOpen(viewport.height < window.innerHeight * KEYBOARD_SHRINK_RATIO);
    update();
    viewport.addEventListener("resize", update);
    return () => viewport.removeEventListener("resize", update);
  }, []);

  return open;
}

export function BottomNav() {
  const pathname = usePathname();
  const status = useSessionStatus();
  const { open } = useLoginSheet();
  const { hidden } = useBottomNav();
  const keyboardOpen = useKeyboardOpen();

  if (hidden || keyboardOpen) return null;

  return (
    <nav
      aria-label="주요 메뉴"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-20 pb-[env(safe-area-inset-bottom,0px)]"
    >
      <ul className="mx-auto flex max-w-md items-stretch justify-around px-2 pb-1 pt-2">
        {NAV_ITEMS.map((item) => {
          const isHome = item.href === "/";
          const current = isHome ? pathname === "/" : pathname.startsWith(item.href);
          const locked = status === "guest" && !isHome;
          const tone = current ? "text-[#f4f1ff]" : "text-[#f4f1ff]/60";
          const className = `pointer-events-auto relative flex min-w-14 flex-col items-center gap-0.5 px-2 py-1 transition-colors hover:text-[#f4f1ff] ${tone}`;
          const content = (
            <>
              <span className={`relative ${ICON_SHADOW}`}>
                {item.icon}
                {locked && <LockBadge />}
              </span>
              <span className={`text-[11px] ${current ? "font-medium" : ""} ${LABEL_SHADOW}`}>
                {item.label}
              </span>
            </>
          );

          return (
            <li key={item.href} className="flex">
              {locked ? (
                <button
                  type="button"
                  aria-label={`${item.label} (로그인하면 열려요)`}
                  onClick={() => open({ next: item.href })}
                  className={className}
                >
                  {content}
                </button>
              ) : (
                <Link
                  href={item.href}
                  aria-label={item.label}
                  aria-current={current ? "page" : undefined}
                  className={className}
                >
                  {content}
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
