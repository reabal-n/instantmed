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
 * Polls /api/admin/system-health every 45s. Failure-tolerant: if the endpoint
 * is unreachable, the pill stays at last-known state rather than flashing red.
 */
export interface SystemHealth {
  stuckIntakes: number
  webhookFailures: number
  parchmentFailures: number
  emailFailures: number
  stripePriceIssues: number
  /** Total of all the above. Server-computed so we don't drift. */
  totalIssues: number
}

const EMPTY_HEALTH: SystemHealth = {
  stuckIntakes: 0,
  webhookFailures: 0,
  parchmentFailures: 0,
  emailFailures: 0,
  stripePriceIssues: 0,
  totalIssues: 0,
}

const POLL_INTERVAL_MS = 45_000

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
      count: Number(health[item.key]) || 0,
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
        setHealth({
          stuckIntakes: Number(next.stuckIntakes) || 0,
          webhookFailures: Number(next.webhookFailures) || 0,
          parchmentFailures: Number(next.parchmentFailures) || 0,
          emailFailures: Number(next.emailFailures) || 0,
          stripePriceIssues: Number(next.stripePriceIssues) || 0,
          totalIssues: Number(next.totalIssues) || 0,
        })
      } catch {
        // Advisory; keep last known state.
      }
    }

    refresh()
    const interval = window.setInterval(refresh, POLL_INTERVAL_MS)
    return () => {
      cancelled = true
      window.clearInterval(interval)
    }
  }, [])

  const handleManualRefresh = async () => {
    setIsRefreshing(true)
    try {
      const res = await fetch("/api/admin/system-health", { cache: "no-store" })
      if (res.ok) {
        const next = (await res.json()) as SystemHealth
        setHealth({
          stuckIntakes: Number(next.stuckIntakes) || 0,
          webhookFailures: Number(next.webhookFailures) || 0,
          parchmentFailures: Number(next.parchmentFailures) || 0,
          emailFailures: Number(next.emailFailures) || 0,
          stripePriceIssues: Number(next.stripePriceIssues) || 0,
          totalIssues: Number(next.totalIssues) || 0,
        })
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

  // Self-hide when everything is healthy. The all-clear state was permanent
  // header noise the operator learned to ignore. Absence is the signal: if
  // nothing is showing, nothing is broken. The pill reappears the moment a
  // recovery surface hits a non-zero issue count.
  if (total === 0) return null

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
          aria-label={`System health: ${total} ${summaryLabel} need attention`}
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
          <span className="tabular-nums">{total}</span>
          <span className="hidden sm:inline">{summaryLabel}</span>
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
          Polls every 45 seconds. Click a row to investigate.
        </p>

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
  count: number
  href: string
}) {
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
      {ok ? (
        <span className="text-xs text-success">clear</span>
      ) : (
        <Badge variant="warning" className="tabular-nums">
          {count > 99 ? "99+" : count}
        </Badge>
      )}
    </Link>
  )
}
