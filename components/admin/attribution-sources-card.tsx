import { type AttributionSourceGroup } from "@/lib/analytics/source-classification"
import type { AttributionSourceBreakdown } from "@/lib/data/dashboard-attribution"
import { cn } from "@/lib/utils"

/**
 * Calm-chrome dot colors per attribution group. Mirrors the AttributionChip
 * taxonomy (amber for paid, emerald for organic, violet for AI referral,
 * blue for relational, slate for unattributed) without ever applying a
 * colored backdrop. The dashboard tile is glance-able, not loud.
 */
const DOT_COLOR: Record<AttributionSourceGroup, string> = {
  google_ads: "bg-amber-500",
  other_paid: "bg-amber-500",
  organic_brand: "bg-emerald-500",
  organic_nonbrand: "bg-emerald-500",
  ai_referral: "bg-violet-500",
  recovery_email: "bg-blue-500",
  referral: "bg-blue-500",
  direct: "bg-slate-400",
  unknown: "bg-slate-400",
}

interface AttributionSourcesCardProps {
  breakdown: AttributionSourceBreakdown
  className?: string
}

/**
 * Where patients came from. Top-5 attribution sources for the last
 * `windowDays`, ranked by paid-intake count.
 *
 * Self-hides (returns `null`) when there are zero paid intakes in the
 * window, so a quiet day never wastes operator real estate.
 */
export function AttributionSourcesCard({
  breakdown,
  className,
}: AttributionSourcesCardProps) {
  if (breakdown.totalIntakes === 0) return null

  return (
    <section
      aria-label="Where patients came from"
      className={cn(
        "rounded-xl border border-border/50 bg-card p-4 shadow-sm shadow-primary/[0.04]",
        className,
      )}
    >
      <header className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold tracking-tight text-foreground">
          Where patients came from
        </h2>
        <span className="text-xs text-muted-foreground tabular-nums">
          Last {breakdown.windowDays} days &middot; {breakdown.totalIntakes} paid
        </span>
      </header>
      <ul className="mt-3 space-y-1.5">
        {breakdown.topSources.map((source) => {
          const pct = Math.round(source.share * 100)
          return (
            <li
              key={source.group}
              className="flex items-center justify-between gap-3 text-sm"
            >
              <span className="flex min-w-0 items-center gap-2 text-foreground">
                <span
                  aria-hidden="true"
                  className={cn(
                    "h-2 w-2 shrink-0 rounded-full ring-1 ring-inset ring-black/5",
                    DOT_COLOR[source.group],
                  )}
                />
                <span className="truncate">{source.label}</span>
              </span>
              <span className="shrink-0 tabular-nums text-muted-foreground">
                {source.count} <span className="text-xs">({pct}%)</span>
              </span>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
