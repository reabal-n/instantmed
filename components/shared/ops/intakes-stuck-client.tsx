"use client"

/**
 * Stuck Intakes Admin Viewer
 *
 * Displays intakes that are stuck in SLA-breaching states.
 *
 * Shared component - use basePath to control URL prefix.
 */

import { AlertTriangle, CheckCircle2, Clock, ExternalLink, Mail, RefreshCcw } from "lucide-react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useState } from "react"

import { OperatorPage, OperatorPageHeader, OperatorScrollArea } from "@/components/operator"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { StuckCounts, StuckIntake, StuckReason } from "@/lib/data/intake-ops"
import { formatAge } from "@/lib/format"
import { cn } from "@/lib/utils"

// ============================================================================
// PROPS
// ============================================================================

interface IntakesStuckClientProps {
  initialData: StuckIntake[]
  counts: StuckCounts
  serviceTypes: string[]
  filters: {
    reason?: StuckReason
    service_type?: string
    status?: string
  }
  error?: string
  basePath?: string
}

// ============================================================================
// HELPERS
// ============================================================================

const REASON_LABELS: Record<StuckReason, string> = {
  paid_no_review: "Paid, No Review",
  review_timeout: "Review Timeout",
  delivery_pending: "Delivery Pending",
  delivery_failed: "Delivery Failed",
}

const REASON_DESCRIPTIONS: Record<StuckReason, string> = {
  paid_no_review: "Paid but not picked up within 5 minutes",
  review_timeout: "In review or pending info for over 60 minutes",
  delivery_pending: "Approved but no delivery email within 10 minutes",
  delivery_failed: "Approved but delivery email failed",
}

const REASON_ICONS: Record<StuckReason, React.ReactNode> = {
  paid_no_review: <Clock className="h-4 w-4" />,
  review_timeout: <AlertTriangle className="h-4 w-4" />,
  delivery_pending: <Mail className="h-4 w-4" />,
  delivery_failed: <AlertTriangle className="h-4 w-4 text-destructive" />,
}

function getReasonBadgeVariant(reason: StuckReason): "default" | "secondary" | "destructive" | "outline" {
  switch (reason) {
    case "paid_no_review":
      return "secondary"
    case "review_timeout":
      return "default"
    case "delivery_pending":
      return "outline"
    case "delivery_failed":
      return "destructive"
    default:
      return "default"
  }
}

function getReasonCount(counts: StuckCounts, reason: StuckReason): number {
  return counts[reason]
}

// ============================================================================
// COMPONENT
// ============================================================================

export function IntakesStuckClient({
  initialData,
  counts,
  serviceTypes,
  filters,
  error,
  basePath = "/admin/ops",
}: IntakesStuckClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isRefreshing, setIsRefreshing] = useState(false)

  const handleFilterChange = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value && value !== "all") {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    router.push(`${basePath}/intakes-stuck?${params.toString()}`)
  }

  const handleRefresh = () => {
    setIsRefreshing(true)
    router.refresh()
    setTimeout(() => setIsRefreshing(false), 1000)
  }

  const clearFilters = () => {
    router.push(`${basePath}/intakes-stuck`)
  }

  const summaryReasons: StuckReason[] = ["paid_no_review", "review_timeout", "delivery_pending", "delivery_failed"]

  return (
    <OperatorPage>
      <OperatorPageHeader
        title="Stuck intakes"
        description="Paid requests that need recovery before they become patient-facing issues."
        backHref={basePath}
        backLabel="Operations"
        actions={
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={isRefreshing}
        >
          <RefreshCcw className={`mr-2 h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
          Refresh
        </Button>
        }
      />

      <OperatorScrollArea>
      {/* Error state */}
      {error && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <p className="text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Summary chips */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border/50 bg-card px-3 py-2 shadow-sm shadow-primary/[0.03]">
        <Badge variant={counts.total > 0 ? "warning" : "success"} className="h-8 px-3">
          {counts.total > 0 ? `${counts.total} stuck` : "Clear"}
        </Badge>
        {summaryReasons.map((reason) => {
          const active = filters.reason === reason
          const count = getReasonCount(counts, reason)
          return (
            <button
              key={reason}
              type="button"
              className={cn(
                "inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-xs font-semibold transition-colors",
                active
                  ? "border-primary/35 bg-primary/10 text-primary"
                  : "border-border/50 bg-background text-muted-foreground hover:bg-muted/40 hover:text-foreground",
              )}
              onClick={() => handleFilterChange("reason", active ? "all" : reason)}
              aria-pressed={active}
            >
              {REASON_ICONS[reason]}
              {REASON_LABELS[reason]}
              <span className="tabular-nums">{count}</span>
            </button>
          )
        })}
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border/50 bg-card px-3 py-2 shadow-sm shadow-primary/[0.03]">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Filters</span>
        <Select
          value={filters.reason || "all"}
          onValueChange={(v) => handleFilterChange("reason", v)}
        >
          <SelectTrigger className="h-8 w-[168px] text-xs">
            <SelectValue placeholder="All reasons" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All reasons</SelectItem>
            <SelectItem value="paid_no_review">Paid, No Review</SelectItem>
            <SelectItem value="review_timeout">Review Timeout</SelectItem>
            <SelectItem value="delivery_pending">Delivery Pending</SelectItem>
            <SelectItem value="delivery_failed">Delivery Failed</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={filters.service_type || "all"}
          onValueChange={(v) => handleFilterChange("service_type", v)}
        >
          <SelectTrigger className="h-8 w-[168px] text-xs">
            <SelectValue placeholder="All services" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All services</SelectItem>
            {serviceTypes.map((type) => (
              <SelectItem key={type} value={type}>
                {type.replace(/_/g, " ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.status || "all"}
          onValueChange={(v) => handleFilterChange("status", v)}
        >
          <SelectTrigger className="h-8 w-[150px] text-xs">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="in_review">In Review</SelectItem>
            <SelectItem value="pending_info">Pending Info</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
          </SelectContent>
        </Select>

        {(filters.reason || filters.service_type || filters.status) && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            Clear
          </Button>
        )}
      </div>

      {/* Task rows */}
      <Card>
        <CardContent className="p-0">
          <div data-testid="stuck-intakes-task-list" className="divide-y divide-border/50">
            {initialData.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
                <CheckCircle2 className="h-8 w-8 text-success" />
                <span className="text-sm text-muted-foreground">No stuck intakes found</span>
              </div>
            ) : (
              initialData.map((intake) => (
                <div
                  key={intake.id}
                  className="grid gap-3 px-3 py-3 transition-colors hover:bg-muted/35 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)_auto] lg:items-center"
                >
                  <div className="min-w-0">
                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                      <span className="truncate font-mono text-sm font-semibold text-foreground">
                        {intake.reference_number}
                      </span>
                      <Badge variant={getReasonBadgeVariant(intake.stuck_reason)}>
                        <span className="mr-1">{REASON_ICONS[intake.stuck_reason]}</span>
                        {REASON_LABELS[intake.stuck_reason]}
                      </Badge>
                      <Badge variant="outline">{intake.status}</Badge>
                    </div>
                    <p className="mt-1 truncate text-sm text-muted-foreground">
                      {intake.patient_name || "Unknown patient"} · {intake.patient_email || "No email"}
                    </p>
                  </div>
                  <div className="min-w-0 text-sm">
                    <p className="truncate font-medium text-foreground">
                      {intake.service_name || intake.category}
                      {intake.subtype ? ` · ${intake.subtype}` : ""}
                    </p>
                    <p className={cn("mt-1 text-xs font-medium", intake.stuck_age_minutes > 60 ? "text-destructive" : "text-muted-foreground")}>
                      Stuck for {formatAge(intake.stuck_age_minutes)}
                    </p>
                  </div>
                  <Button asChild variant="ghost" size="sm" className="justify-self-start lg:justify-self-end">
                    <Link href={`/admin/intakes/${intake.id}`}>
                      <ExternalLink className="h-4 w-4" />
                      Open intake
                    </Link>
                  </Button>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Legend */}
      <details className="rounded-xl border border-border/50 bg-card shadow-sm shadow-primary/[0.03]">
        <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-muted-foreground">
          SLA thresholds
        </summary>
        <div className="border-t border-border/50 px-4 py-3">
          <div className="grid gap-3 md:grid-cols-2">
            {(Object.keys(REASON_LABELS) as StuckReason[]).map((reason) => (
              <div key={reason} className="flex items-start gap-3">
                <div className="mt-0.5">{REASON_ICONS[reason]}</div>
                <div>
                  <div className="font-medium text-sm">{REASON_LABELS[reason]}</div>
                  <div className="text-sm text-muted-foreground">
                    {REASON_DESCRIPTIONS[reason]}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </details>
      </OperatorScrollArea>
    </OperatorPage>
  )
}
