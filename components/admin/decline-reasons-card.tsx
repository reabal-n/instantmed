import type { DeclineReasonBreakdown } from "@/lib/data/dashboard-decline-trends"
import { cn } from "@/lib/utils"

interface DeclineReasonsCardProps {
  breakdown: DeclineReasonBreakdown
  className?: string
}

/**
 * Decline reasons — top-5 reason codes for declined requests in the last
 * `windowDays`. Surfaces service-line health at a glance: a spike in
 * "controlled substance" or "insufficient info" tells you something is off
 * in intake screening before it becomes a refund problem.
 *
 * Self-hides (returns `null`) when there are zero declines in the window.
 * All decline rows share an amber dot because every decline is an attention
 * signal — distinguishing the relative count is the operator's job here.
 */
export function DeclineReasonsCard({ breakdown, className }: DeclineReasonsCardProps) {
  if (breakdown.totalDeclines === 0) return null

  return (
    <section
      aria-label="Decline reasons"
      className={cn(
        "rounded-xl border border-border/50 bg-card p-4 shadow-sm shadow-primary/[0.04]",
        className,
      )}
    >
      <header className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold tracking-tight text-foreground">
          Decline reasons
        </h2>
        <span className="text-xs text-muted-foreground tabular-nums">
          Last {breakdown.windowDays} days &middot; {breakdown.totalDeclines} declined
        </span>
      </header>
      <ul className="mt-3 space-y-1.5">
        {breakdown.topReasons.map((reason) => {
          const pct =
            breakdown.totalDeclines > 0
              ? Math.round((reason.count / breakdown.totalDeclines) * 100)
              : 0
          return (
            <li
              key={reason.code}
              className="flex items-center justify-between gap-3 text-sm"
            >
              <span className="flex min-w-0 items-center gap-2 text-foreground">
                <span
                  aria-hidden="true"
                  className="h-2 w-2 shrink-0 rounded-full bg-amber-500 ring-1 ring-inset ring-black/5"
                />
                <span className="truncate">{reason.label}</span>
              </span>
              <span className="shrink-0 tabular-nums text-muted-foreground">
                {reason.count} <span className="text-xs">({pct}%)</span>
              </span>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
