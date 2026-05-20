import Link from "next/link"
import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

export type CounterCardTone = "neutral" | "warning" | "critical"

const TONE_DOT: Record<CounterCardTone, string> = {
  neutral: "bg-slate-400",
  warning: "bg-amber-500",
  critical: "bg-red-500",
}

const TONE_BORDER: Record<CounterCardTone, string> = {
  neutral: "border-border/50",
  warning: "border-amber-200/60 dark:border-amber-500/30",
  critical: "border-red-200/60 dark:border-red-500/30",
}

type CounterCardProps = {
  count: number
  label: string
  helperText: string
  tone: CounterCardTone
  href?: string
  className?: string
}

export function CounterCard({
  count,
  label,
  helperText,
  tone,
  href,
  className,
}: CounterCardProps) {
  const inner: ReactNode = (
    <>
      <div className="text-3xl font-semibold tabular-nums text-foreground">{count}</div>
      <div className="mt-1 text-sm font-medium text-foreground">{label}</div>
      <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
        <span
          aria-hidden="true"
          className={cn(
            "h-2 w-2 shrink-0 rounded-full ring-1 ring-inset ring-black/5",
            TONE_DOT[tone],
          )}
        />
        <span>{helperText}</span>
      </div>
    </>
  )

  const baseClass = cn(
    "flex min-h-[140px] flex-col rounded-xl border bg-card p-4 shadow-sm shadow-primary/[0.04] transition-colors",
    TONE_BORDER[tone],
    href && "hover:border-primary/30 hover:bg-accent/30",
    className,
  )

  if (href) {
    return (
      <Link
        href={href}
        data-testid="counter-card"
        data-tone={tone}
        className={baseClass}
      >
        {inner}
      </Link>
    )
  }

  return (
    <div data-testid="counter-card" data-tone={tone} className={baseClass}>
      {inner}
    </div>
  )
}
