"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/hoy", label: "Hoy", glyph: "◧" },
  { href: "/ciudad", label: "Ciudad", glyph: "◨" },
  { href: "/retos", label: "Retos", glyph: "◩" },
  { href: "/grupo", label: "Grupo", glyph: "◪" },
] as const;

export default function AppNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Secciones"
      className="fixed inset-x-0 bottom-0 z-20 border-t-2 border-[var(--ink)] bg-[var(--card)] sm:static sm:border-0 sm:bg-transparent"
    >
      <ul className="mx-auto flex max-w-5xl sm:gap-1 sm:px-0">
        {TABS.map((tab) => {
          const active = pathname === tab.href;
          return (
            <li key={tab.href} className="flex-1 sm:flex-none">
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className="flex flex-col items-center gap-0.5 px-3 py-2.5 text-sm font-semibold sm:flex-row sm:gap-2 sm:rounded-[3px] sm:border-2 sm:px-3.5 sm:py-1.5"
                style={
                  active
                    ? { background: "var(--ink)", color: "var(--paper)", borderColor: "var(--ink)" }
                    : { borderColor: "transparent" }
                }
              >
                <span aria-hidden="true" className="text-base leading-none sm:text-sm">
                  {tab.glyph}
                </span>
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
