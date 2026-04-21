"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { cn } from "@/lib/utils"

/**
 * Client island for the YesterdayWidget's Today/Yesterday toggle.
 *
 * URL-driven so the selection is bookmarkable and survives reloads. The
 * widget itself stays a server component — only this segmented control
 * needs client JS for the active state.
 */
export function YesterdayWidgetWindowToggle({
  current,
}: {
  current: "today" | "yesterday"
}) {
  const pathname = usePathname() ?? "/admin"

  const base =
    "px-2.5 py-1 text-xs font-medium rounded-md transition-colors"
  const active =
    "bg-foreground text-background"
  const idle =
    "text-muted-foreground hover:text-foreground"

  return (
    <div
      role="tablist"
      aria-label="Digest window"
      className="inline-flex items-center gap-1 p-1 rounded-lg bg-muted/60 dark:bg-white/5 border border-border/40"
    >
      <Link
        role="tab"
        aria-selected={current === "yesterday"}
        href={`${pathname}?window=yesterday`}
        className={cn(base, current === "yesterday" ? active : idle)}
      >
        24h
      </Link>
      <Link
        role="tab"
        aria-selected={current === "today"}
        href={`${pathname}?window=today`}
        className={cn(base, current === "today" ? active : idle)}
      >
        Today
      </Link>
    </div>
  )
}
