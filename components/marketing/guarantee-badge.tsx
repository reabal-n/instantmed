import { ShieldCheck } from "lucide-react"
import Link from "next/link"

import { GUARANTEE } from "@/lib/marketing/voice"
import { cn } from "@/lib/utils"

/**
 * GuaranteeBadge - the time-bound review promise pill.
 *
 * Single source of truth is `GUARANTEE` in lib/marketing/voice.ts
 * ("Doctor reviews in 2 hours or we waive the fee.")
 *
 * Renders in three sizes so it can live above a checkout CTA (`md`),
 * inline on heroes (`sm`), or on a dedicated standalone block (`lg`).
 *
 * Always links to the terms so the promise is verifiable. If the target
 * route changes, update `GUARANTEE_HREF` only.
 */

/** Where the guarantee terms live. Dedicated /guarantee page (created 2026-04-21). */
export const GUARANTEE_HREF = "/guarantee"

type Size = "sm" | "md" | "lg"

interface GuaranteeBadgeProps {
  /** Pill size. `sm` = hero rows, `md` = above checkout CTA, `lg` = dedicated block. */
  size?: Size
  /** When true, renders as a Link to `GUARANTEE_HREF`. Default true. */
  linked?: boolean
  /** Hides the icon; useful in extremely tight rows. */
  iconless?: boolean
  className?: string
}

const SIZE_STYLES: Record<Size, { padding: string; text: string; icon: string; rounded: string }> = {
  sm: { padding: "px-2.5 py-1",   text: "text-[11px]", icon: "h-3 w-3",     rounded: "rounded-full" },
  md: { padding: "px-3 py-1.5",   text: "text-xs",     icon: "h-3.5 w-3.5", rounded: "rounded-full" },
  lg: { padding: "px-4 py-2.5",   text: "text-sm",     icon: "h-4 w-4",     rounded: "rounded-xl"   },
}

export function GuaranteeBadge({
  size = "md",
  linked = true,
  iconless = false,
  className,
}: GuaranteeBadgeProps) {
  const s = SIZE_STYLES[size]

  const inner = (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 font-medium",
        "border border-emerald-200 bg-emerald-50 text-emerald-800",
        "dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-300",
        s.padding,
        s.text,
        s.rounded,
        linked && "transition-colors hover:bg-emerald-100 dark:hover:bg-emerald-950/60",
        className,
      )}
    >
      {!iconless && <ShieldCheck className={cn(s.icon, "shrink-0")} aria-hidden="true" />}
      {GUARANTEE}
    </span>
  )

  if (!linked) return inner

  return (
    <Link
      href={GUARANTEE_HREF}
      className="inline-flex focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 focus-visible:ring-offset-2 rounded-full"
      title="Refund policy and approval window"
    >
      {inner}
    </Link>
  )
}
