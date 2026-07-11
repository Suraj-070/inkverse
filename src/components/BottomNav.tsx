"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  {
    href: "/journal",
    label: "Journal",
    icon: (
      <path d="M5 3h11a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Zm2 0v18M11 8h4M11 12h4" />
    ),
  },
  {
    href: "/memories",
    label: "Memories",
    icon: (
      <path d="M12 8v4l3 2m6-2a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    ),
  },
  {
    href: "/mood",
    label: "Mood",
    icon: (
      <path d="M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    ),
  },
  {
    href: "/settings",
    label: "Settings",
    icon: (
      <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm7-3a7 7 0 0 1-.06.9l2 1.55-2 3.46-2.36-.95a7 7 0 0 1-1.56.9L14.6 20h-4l-.42-2.14a7 7 0 0 1-1.56-.9l-2.36.95-2-3.46 2-1.55A7 7 0 0 1 6.2 12a7 7 0 0 1 .06-.9l-2-1.55 2-3.46 2.36.95a7 7 0 0 1 1.56-.9L10.6 4h4l.42 2.14a7 7 0 0 1 1.56.9l2.36-.95 2 3.46-2 1.55c.04.3.06.6.06.9Z" />
    ),
  },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-white/5 bg-[var(--color-ink)]/95 backdrop-blur safe-bottom">
      <div className="mx-auto flex max-w-md items-stretch justify-around">
        {tabs.map((t) => {
          const active = pathname.startsWith(t.href);
          return (
            <Link
              key={t.href}
              href={t.href}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[10px] ${
                active
                  ? "text-[var(--color-brass)]"
                  : "text-[var(--color-paper)]/40"
              }`}
            >
              <svg
                viewBox="0 0 24 24"
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                {t.icon}
              </svg>
              {t.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
