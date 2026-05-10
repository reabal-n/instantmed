"use client"

/**
 * Doctor Ops Dashboard
 *
 * Operational metrics per doctor. No leaderboards, no ranks, no points.
 * Just visibility into workload and performance.
 *
 * Shared component - use basePath to control URL prefix.
 */

import { ArrowDown, ArrowUp, ArrowUpDown, RefreshCcw, Users } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import { useState } from "react"

import { OperatorPage, OperatorPageHeader, OperatorScrollArea } from "@/components/operator"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import type { DateRange, DoctorMetrics, SortDirection,SortField } from "@/lib/data/doctor-ops"
import { formatMinutes } from "@/lib/format"
import { cn } from "@/lib/utils"

// ============================================================================
// PROPS
// ============================================================================

interface DoctorOpsClientProps {
  initialData: DoctorMetrics[]
  dateRange: DateRange
  sortField: SortField
  sortDirection: SortDirection
  error?: string
  basePath?: string
}

// ============================================================================
// HELPERS
// ============================================================================

function getTimeColor(minutes: number | null, threshold: number): string {
  if (minutes === null) return ""
  if (minutes <= threshold) return "text-success"
  if (minutes <= threshold * 2) return "text-warning"
  return "text-destructive"
}

// ============================================================================
// COMPONENT
// ============================================================================

export function DoctorOpsClient({
  initialData,
  dateRange,
  sortField,
  sortDirection,
  error,
  basePath = "/admin/ops",
}: DoctorOpsClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isRefreshing, setIsRefreshing] = useState(false)

  const handleDateRangeChange = (range: DateRange) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set("range", range)
    router.push(`${basePath}/doctors?${params.toString()}`)
  }

  const handleSort = (field: SortField) => {
    const params = new URLSearchParams(searchParams.toString())

    // Toggle direction if same field, otherwise default to desc
    const newDirection = sortField === field && sortDirection === "desc" ? "asc" : "desc"

    params.set("sort", field)
    params.set("dir", newDirection)
    router.push(`${basePath}/doctors?${params.toString()}`)
  }

  const handleRefresh = () => {
    setIsRefreshing(true)
    router.refresh()
    setTimeout(() => setIsRefreshing(false), 1000)
  }

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <ArrowUpDown className="ml-1 h-3 w-3 opacity-50" />
    }
    return sortDirection === "asc"
      ? <ArrowUp className="ml-1 h-3 w-3" />
      : <ArrowDown className="ml-1 h-3 w-3" />
  }

  // Summary stats
  const totalDoctors = initialData.length
  const totalPending = initialData.reduce((sum, d) => sum + d.pending_count + d.in_review_count, 0)
  const totalDecisions = initialData.reduce((sum, d) => sum + d.total_decisions, 0)
  const totalBreaches = initialData.reduce((sum, d) => sum + d.sla_breaches, 0)
  const sortControls: Array<{ field: SortField; label: string }> = [
    { field: "doctor_name", label: "Doctor" },
    { field: "pending_count", label: "Pending" },
    { field: "median_time_to_first_action_minutes", label: "First action" },
    { field: "median_time_to_decision_minutes", label: "Decision" },
    { field: "total_decisions", label: "Decisions" },
    { field: "sla_breaches", label: "Breaches" },
  ]

  return (
    <OperatorPage>
      <OperatorPageHeader
        title="Doctor ops"
        description="Workload and review timing without leaderboards or gamification."
        backHref={basePath}
        backLabel="Operations"
        actions={
        <div className="flex items-center gap-2">
          {/* Date Range Toggle */}
          <div className="flex rounded-md border">
            <Button
              variant={dateRange === "7d" ? "default" : "ghost"}
              size="sm"
              className="rounded-r-none"
              onClick={() => handleDateRangeChange("7d")}
            >
              7 days
            </Button>
            <Button
              variant={dateRange === "30d" ? "default" : "ghost"}
              size="sm"
              className="rounded-l-none"
              onClick={() => handleDateRangeChange("30d")}
            >
              30 days
            </Button>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCcw className={`mr-2 h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
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
        {[
          { label: "Doctors", value: totalDoctors, icon: <Users className="h-3.5 w-3.5" /> },
          { label: "Pending", value: totalPending, icon: null },
          { label: `Decisions ${dateRange}`, value: totalDecisions, icon: null },
          { label: "Breaches", value: totalBreaches, icon: null, alert: totalBreaches > 0 },
        ].map((item) => (
          <span
            key={item.label}
            className={cn(
              "inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-xs font-semibold",
              item.alert
                ? "border-destructive/30 bg-destructive/10 text-destructive"
                : "border-border/50 bg-background text-muted-foreground",
            )}
          >
            {item.icon}
            {item.label}
            <span className="tabular-nums text-foreground">{item.value}</span>
          </span>
        ))}
      </div>

      {/* Doctor task rows */}
      <Card>
        <CardContent className="p-0">
          <div className="flex flex-wrap items-center gap-2 border-b border-border/50 px-3 py-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Sort</span>
            {sortControls.map((control) => (
              <button
                key={control.field}
                type="button"
                className={cn(
                  "inline-flex h-8 items-center gap-1 rounded-md px-2.5 text-xs font-semibold transition-colors",
                  sortField === control.field
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                )}
                onClick={() => handleSort(control.field)}
              >
                {control.label}
                <SortIcon field={control.field} />
              </button>
            ))}
          </div>
          <div data-testid="doctor-ops-task-list" className="divide-y divide-border/50">
            {initialData.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
                <Users className="h-8 w-8 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">No doctor data available</span>
              </div>
            ) : (
              initialData.map((doctor) => (
                <div
                  key={doctor.doctor_id}
                  className="grid gap-3 px-3 py-3 transition-colors hover:bg-muted/35 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] lg:items-center"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">{doctor.doctor_name}</p>
                    {doctor.doctor_email && (
                      <p className="mt-1 truncate text-xs text-muted-foreground">{doctor.doctor_email}</p>
                    )}
                  </div>
                  <div className="flex min-w-0 flex-wrap items-center gap-2 text-sm">
                    <Badge variant={doctor.pending_count > 0 ? "warning" : "outline"} className="text-xs">
                      {doctor.pending_count + doctor.in_review_count} pending
                    </Badge>
                    {doctor.pending_count > 0 && <Badge variant="secondary" className="text-xs">{doctor.pending_count} new</Badge>}
                    {doctor.in_review_count > 0 && <Badge variant="outline" className="text-xs">{doctor.in_review_count} in review</Badge>}
                    {doctor.sla_breaches > 0 && <Badge variant="destructive" className="text-xs">{doctor.sla_breaches} breach</Badge>}
                  </div>
                  <div className="grid gap-1 text-xs text-muted-foreground sm:grid-cols-3 lg:min-w-[360px]">
                    <span>
                      First <strong className={getTimeColor(doctor.median_time_to_first_action_minutes, 5)}>
                        {formatMinutes(doctor.median_time_to_first_action_minutes)}
                      </strong>
                    </span>
                    <span>
                      Decision <strong className={getTimeColor(doctor.median_time_to_decision_minutes, 30)}>
                        {formatMinutes(doctor.median_time_to_decision_minutes)}
                      </strong>
                    </span>
                    <span>
                      {doctor.total_decisions} decisions
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Legend */}
      <details className="rounded-xl border border-border/50 bg-card shadow-sm shadow-primary/[0.03]">
        <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-muted-foreground">
          Metrics guide
        </summary>
        <div className="border-t border-border/50 px-4 py-3">
          <div className="grid gap-3 text-sm md:grid-cols-2">
            <div>
              <div className="font-medium">Pending</div>
              <div className="text-muted-foreground">
                Intakes in &quot;paid&quot; or &quot;in_review&quot; status assigned to this doctor
              </div>
            </div>
            <div>
              <div className="font-medium">Median First Action</div>
              <div className="text-muted-foreground">
                Time from payment to first doctor action (target: &lt;5 min)
              </div>
            </div>
            <div>
              <div className="font-medium">Median Decision</div>
              <div className="text-muted-foreground">
                Time from payment to approval/decline (target: &lt;30 min)
              </div>
            </div>
            <div>
              <div className="font-medium">SLA Breaches</div>
              <div className="text-muted-foreground">
                Intakes exceeding SLA thresholds while assigned to this doctor
              </div>
            </div>
          </div>
        </div>
      </details>
      </OperatorScrollArea>
    </OperatorPage>
  )
}
