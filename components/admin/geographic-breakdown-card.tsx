import type { GeographicBreakdown } from "@/lib/data/analytics-geographic"
import { cn } from "@/lib/utils"

interface GeographicBreakdownCardProps {
  breakdown: GeographicBreakdown
  className?: string
}

/**
 * Top Australian states by distinct paid patient over the last
 * `windowDays`. Calm-chrome compliant: 8px dot + plain text, no
 * tinted backdrops. Self-hides when there are zero paid patients in
 * the window so a quiet day never wastes operator real estate.
 *
 * Patients with no state on file are surfaced separately so the
 * operator can see how much address coverage is still missing now
 * that the prescribing-identity gate enforces state for every
 * non-medcert flow.
 */
export function GeographicBreakdownCard({
  breakdown,
  className,
}: GeographicBreakdownCardProps) {
  if (breakdown.totalPatients === 0) return null

  return (
    <section
      aria-label="Patients by state"
      className={cn(
        "rounded-xl border border-border/50 bg-card p-4 shadow-sm shadow-primary/[0.04]",
        className,
      )}
    >
      <header className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold tracking-tight text-foreground">
          Patients by state
        </h2>
        <span className="text-xs text-muted-foreground tabular-nums">
          Last {breakdown.windowDays} days &middot; {breakdown.totalPatients} unique
        </span>
      </header>
      <ul className="mt-3 space-y-1.5">
        {breakdown.topStates.map((row) => {
          const pct = Math.round(row.share * 100)
          return (
            <li
              key={row.state}
              className="flex items-center justify-between gap-3 text-sm"
            >
              <span className="flex min-w-0 items-center gap-2 text-foreground">
                <span
                  aria-hidden="true"
                  className="h-2 w-2 shrink-0 rounded-full bg-blue-500 ring-1 ring-inset ring-black/5"
                />
                <span className="truncate">{row.state}</span>
              </span>
              <span className="shrink-0 tabular-nums text-muted-foreground">
                {row.count} <span className="text-xs">({pct}%)</span>
              </span>
            </li>
          )
        })}
        {breakdown.unknownCount > 0 ? (
          <li className="flex items-center justify-between gap-3 text-sm">
            <span className="flex min-w-0 items-center gap-2 text-muted-foreground">
              <span
                aria-hidden="true"
                className="h-2 w-2 shrink-0 rounded-full bg-slate-400 ring-1 ring-inset ring-black/5"
              />
              <span className="truncate italic">No state on file</span>
            </span>
            <span className="shrink-0 tabular-nums text-muted-foreground">
              {breakdown.unknownCount}
            </span>
          </li>
        ) : null}
      </ul>
    </section>
  )
}
