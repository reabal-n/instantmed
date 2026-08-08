"use client"

import { AlertCircle, ChevronDown, RefreshCw } from "lucide-react"
import Link from "next/link"
import { useEffect, useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  ADMIN_PARCHMENT_OPS_HREF,
  ADMIN_STALE_INTAKES_HREF,
  ADMIN_WEBHOOK_DLQ_HREF,
  STAFF_EMAILS_HREF,
  STAFF_OPS_HREF,
} from "@/lib/dashboard/routes"
import { cn } from "@/lib/utils"

/**
 * SystemHealthPill — single glance at the recovery surfaces.
 *
 * Phase 2 of dashboard remaster (2026-05-12). Replaces the operator's habit of
 * pre-emptively opening `/admin/ops` to check whether anything is on fire.
 * Renders a colored dot + count in the header; clicking opens a popover with
 * the breakdown and deep links to the relevant ops surface.
 *
 * Polls /api/admin/system-health every 90s (POLL_INTERVAL_MS is the single
 * source of truth — keep this comment and the popover copy in sync with it).
 * Failure-tolerant: if the endpoint is unreachable, the pill stays at
 * last-known state rather than flashing red.
 */
export interface SystemHealth {
  /** `null` = that surface's read failed; the count is unknown, not zero. */
  stuckIntakes: number | null
  webhookFailures: number | null
  parchmentFailures: number | null
  emailFailures: number | null
  stripePriceIssues: number
  /** Total of the KNOWN counts. Server-computed so we don't drift. */
  totalIssues: number
  /** True when any surface read failed — all-clear cannot be asserted. */
  degraded: boolean
}

const EMPTY_HEALTH: SystemHealth = {
  stuckIntakes: 0,
  webhookFailures: 0,
  parchmentFailures: 0,
  emailFailures: 0,
  stripePriceIssues: 0,
  totalIssues: 0,
  degraded: false,
}

/**
 * Parse a health payload without coercing unknown to zero: `null` counts stay
 * `null` (`Number(null)` would silently turn a failed read into "clear").
 */
function normalizeHealth(next: SystemHealth): SystemHealth {
  const count = (value: number | null | undefined): number | null =>
    value === null || value === undefined ? null : Number(value) || 0
  return {
    stuckIntakes: count(next.stuckIntakes),
    webhookFailures: count(next.webhookFailures),
    parchmentFailures: count(next.parchmentFailures),
    emailFailures: count(next.emailFailures),
    stripePriceIssues: Number(next.stripePriceIssues) || 0,
    totalIssues: Number(next.totalIssues) || 0,
    degraded: Boolean(next.degraded),
  }
}

const POLL_INTERVAL_MS = 90_000

const HEALTH_ISSUE_LABELS = [
  { key: "stuckIntakes", singular: "waiting at intake", plural: "waiting at intake" },
  { key: "webhookFailures", singular: "webhook failure", plural: "webhook failures" },
  { key: "parchmentFailures", singular: "Parchment failure", plural: "Parchment failures" },
  { key: "emailFailures", singular: "email failure", plural: "email failures" },
  { key: "stripePriceIssues", singular: "Stripe config issue", plural: "Stripe config issues" },
] as const

function dominantSystemHealthLabel(health: SystemHealth): string {
  const active = HEALTH_ISSUE_LABELS
    .map((item) => ({
      ...item,
      // Unknown (null) surfaces don't contribute a count; they surface via
      // the degraded state instead.
      count: Number(health[item.key] ?? 0) || 0,
    }))
    .filter((item) => item.count > 0)

  if (active.length !== 1) {
    return health.totalIssues === 1 ? "issue" : "issues"
  }

  const [item] = active
  return item.count === 1 ? item.singular : item.plural
}

export function SystemHealthPill({ initial }: { initial?: SystemHealth }) {
  const [health, setHealth] = useState<SystemHealth>(initial ?? EMPTY_HEALTH)
  const [isRefreshing, setIsRefreshing] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function refresh() {
      try {
        const res = await fetch("/api/admin/system-health", { cache: "no-store" })
        if (!res.ok || cancelled) return
        const next = (await res.json()) as SystemHealth
        setHealth(normalizeHealth(next))
      } catch {
        // Advisory; keep last known state.
      }
    }

    // Only poll while the tab is visible (a backgrounded cockpit doesn't need a
    // 4-query health check every cycle); refresh immediately on re-show.
    const refreshIfVisible = () => {
      if (document.visibilityState === "visible") refresh()
    }

    refresh()
    const interval = window.setInterval(refreshIfVisible, POLL_INTERVAL_MS)
    window.addEventListener("focus", refreshIfVisible)
    document.addEventListener("visibilitychange", refreshIfVisible)
    return () => {
      cancelled = true
      window.clearInterval(interval)
      window.removeEventListener("focus", refreshIfVisible)
      document.removeEventListener("visibilitychange", refreshIfVisible)
    }
  }, [])

  const handleManualRefresh = async () => {
    setIsRefreshing(true)
    try {
      const res = await fetch("/api/admin/system-health", { cache: "no-store" })
      if (res.ok) {
        const next = (await res.json()) as SystemHealth
        setHealth(normalizeHealth(next))
      }
    } catch {
      // Advisory.
    } finally {
      setIsRefreshing(false)
    }
  }

  const total = health.totalIssues
  const tone: "warning" | "danger" = total > 5 ? "danger" : "warning"
  const summaryLabel = dominantSystemHealthLabel(health)

  // Self-hide ONLY when everything is healthy AND every read succeeded. The
  // all-clear state was permanent header noise the operator learned to ignore;
  // absence is the signal. But absence may only assert "nothing is broken"
  // when the checks actually ran — a degraded read with zero known issues must
  // still show, otherwise the fire alarm hides exactly when the platform is
  // unobservable.
  if (total === 0 && !health.degraded) return null

  const degradedOnly = total === 0 && health.degraded

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "gap-2 transition-colors",
            tone === "danger" && "border-destructive/40 text-destructive hover:bg-destructive/5",
            tone === "warning" && "border-border/60 text-slate-700 hover:bg-muted/35 dark:text-muted-foreground",
          )}
          aria-label={
            degradedOnly
              ? "System health: checks degraded — status unknown"
              : `System health: ${total} ${summaryLabel} need attention`
          }
        >
          <span
            className={cn(
              "h-2 w-2 rounded-full",
              tone === "warning" && "bg-slate-500",
              tone === "danger" && "bg-destructive",
            )}
            aria-hidden
          />
          <AlertCircle className="h-3.5 w-3.5" aria-hidden />
          {degradedOnly ? (
            <span className="hidden sm:inline">health check degraded</span>
          ) : (
            <>
              <span className="tabular-nums">{total}</span>
              <span className="hidden sm:inline">{summaryLabel}</span>
            </>
          )}
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground/70" aria-hidden />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold text-foreground">System health</p>
          <button
            type="button"
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground disabled:opacity-50"
            aria-label="Refresh system health"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", isRefreshing && "animate-spin")} aria-hidden />
          </button>
        </div>

        <p className="mt-1 text-xs text-muted-foreground">
          {/* Keep in sync with POLL_INTERVAL_MS above. */}
          Polls every {POLL_INTERVAL_MS / 1000} seconds. Click a row to investigate.
        </p>

        {health.degraded ? (
          <p className="mt-2 rounded-md border border-warning-border bg-warning-light/50 px-2 py-1.5 text-xs text-foreground">
            Some health checks failed to load — counts may be incomplete. An
            all-clear cannot be confirmed until they recover.
          </p>
        ) : null}

        <div className="mt-3 space-y-1">
          <HealthRow
            label="Stuck intakes"
            count={health.stuckIntakes}
            href={ADMIN_STALE_INTAKES_HREF}
          />
          <HealthRow
            label="Webhook failures"
            count={health.webhookFailures}
            href={ADMIN_WEBHOOK_DLQ_HREF}
          />
          <HealthRow
            label="Parchment failures"
            count={health.parchmentFailures}
            href={ADMIN_PARCHMENT_OPS_HREF}
          />
          <HealthRow
            label="Email failures"
            count={health.emailFailures}
            href={STAFF_EMAILS_HREF}
          />
          <HealthRow
            label="Stripe price config"
            count={health.stripePriceIssues}
            href={STAFF_OPS_HREF}
          />
        </div>

        <div className="mt-3 border-t border-border/50 pt-3">
          <Button asChild variant="outline" size="sm" className="w-full justify-center">
            <Link href={STAFF_OPS_HREF}>Open operations</Link>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}

function HealthRow({
  label,
  count,
  href,
}: {
  label: string
  /** `null` = this surface's read failed; render "unknown", never "clear". */
  count: number | null
  href: string
}) {
  const unknown = count === null
  const ok = count === 0
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center justify-between gap-3 rounded-md border border-transparent px-2 py-1.5 text-sm transition-colors",
        ok
          ? "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
          : "border-border/40 bg-warning-light/40 hover:border-warning-border hover:bg-warning-light/60",
      )}
    >
      <span>{label}</span>
      {unknown ? (
        <span className="text-xs text-muted-foreground">unknown</span>
      ) : ok ? (
        <span className="text-xs text-success">clear</span>
      ) : (
        <Badge variant="warning" className="tabular-nums">
          {count > 99 ? "99+" : count}
        </Badge>
      )}
    </Link>
  )
}
