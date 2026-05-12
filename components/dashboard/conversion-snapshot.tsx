import { TrendingUp } from "lucide-react"

import { DashboardCard } from "@/components/dashboard/dashboard-card"
import { type ConversionSnapshot, type ConversionWindow, pct } from "@/lib/data/conversion-snapshot"
import { cn } from "@/lib/utils"

/**
 * ConversionSnapshotCard — admin-only compact funnel block.
 *
 * Shows started -> checkout -> paid -> approved counts and CVR across
 * 24h / 7d / 30d / 90d windows. Source of truth is the `intakes` table
 * (lib/data/conversion-snapshot.ts), not PostHog or Google Ads — those
 * are attribution layers that undercount due to adblockers and privacy
 * browsers (2026-05-12 audit: client `purchase_completed` captured 6/28
 * real paid intakes).
 *
 * Intentionally small. One card, four columns, tight typography. The
 * deeper funnel analysis still lives on `/admin/analytics`.
 */

const WINDOW_LABELS: Record<ConversionWindow, string> = {
  "24h": "24h",
  "7d": "7d",
  "30d": "30d",
  "90d": "90d",
}

const WINDOW_ORDER: ConversionWindow[] = ["24h", "7d", "30d", "90d"]

interface ConversionSnapshotCardProps {
  data: ConversionSnapshot
  className?: string
}

function formatNumber(n: number): string {
  return new Intl.NumberFormat("en-AU").format(n)
}

function formatAud(cents: number): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: cents >= 100000 ? 0 : 2,
  }).format(cents / 100)
}

function formatPct(value: number | null): string {
  if (value == null) return "—"
  return `${value.toFixed(value >= 10 ? 0 : 1)}%`
}

export function ConversionSnapshotCard({ data, className }: ConversionSnapshotCardProps) {
  return (
    <DashboardCard tier="standard" padding="md" className={cn("space-y-3", className)}>
      <header className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" aria-hidden />
          <h2 className="text-sm font-semibold tracking-tight">Conversion analytics</h2>
        </div>
        <p className="text-[11px] text-muted-foreground">
          Supabase truth. Excludes test patient.
        </p>
      </header>

      <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
        {WINDOW_ORDER.map((window) => {
          const m = data.windows[window]
          const checkoutRate = pct(m.checkout_reached, m.started)
          const paidRate = pct(m.paid, m.started)
          const approveRate = pct(m.approved, m.paid)

          return (
            <div key={window} className="space-y-1.5">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  {WINDOW_LABELS[window]}
                </span>
                <span className="text-xs font-medium tabular-nums text-foreground">
                  {formatAud(m.revenue_aud_cents)}
                </span>
              </div>
              <dl className="grid grid-cols-[1fr_auto] gap-x-2 gap-y-0.5 text-xs tabular-nums">
                <dt className="text-muted-foreground">Started</dt>
                <dd className="font-medium">{formatNumber(m.started)}</dd>

                <dt className="text-muted-foreground">Checkout</dt>
                <dd className="font-medium">
                  {formatNumber(m.checkout_reached)}
                  <span className="ml-1 text-[10px] text-muted-foreground/70">
                    {formatPct(checkoutRate)}
                  </span>
                </dd>

                <dt className="text-muted-foreground">Paid</dt>
                <dd className="font-medium">
                  {formatNumber(m.paid)}
                  <span className="ml-1 text-[10px] text-muted-foreground/70">
                    {formatPct(paidRate)}
                  </span>
                </dd>

                <dt className="text-muted-foreground">Approved</dt>
                <dd className="font-medium">
                  {formatNumber(m.approved)}
                  <span className="ml-1 text-[10px] text-muted-foreground/70">
                    {formatPct(approveRate)}
                  </span>
                </dd>
              </dl>
            </div>
          )
        })}
      </div>

      <p className="text-[10px] leading-snug text-muted-foreground/70">
        CVR shown next to each stage. Checkout/Paid % of Started. Approved % of Paid.
        Page views live in PostHog.
      </p>
    </DashboardCard>
  )
}
