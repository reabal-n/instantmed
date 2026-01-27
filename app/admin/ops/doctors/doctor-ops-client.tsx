"use client"

/**
 * Doctor Ops Dashboard
 * 
 * Operational metrics per doctor. No leaderboards, no ranks, no points.
 * Just visibility into workload and performance.
 * 
 * UI Location: /admin/ops/doctors
 */

import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { RefreshCcw, ArrowUpDown, ArrowUp, ArrowDown, Users, ArrowLeft } from "lucide-react"
import type { DoctorMetrics, DateRange, SortField, SortDirection } from "@/lib/data/doctor-ops"

// ============================================================================
// PROPS
// ============================================================================

interface DoctorOpsClientProps {
  initialData: DoctorMetrics[]
  dateRange: DateRange
  sortField: SortField
  sortDirection: SortDirection
  error?: string
}

// ============================================================================
// HELPERS
// ============================================================================

function formatMinutes(minutes: number | null): string {
  if (minutes === null) return "—"
  if (minutes < 60) return `${Math.round(minutes)}m`
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = Math.round(minutes % 60)
  if (hours < 24) return `${hours}h ${remainingMinutes}m`
  const days = Math.floor(hours / 24)
  return `${days}d ${hours % 24}h`
}

function getTimeColor(minutes: number | null, threshold: number): string {
  if (minutes === null) return ""
  if (minutes <= threshold) return "text-green-600"
  if (minutes <= threshold * 2) return "text-amber-600"
  return "text-red-600"
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
}: DoctorOpsClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isRefreshing, setIsRefreshing] = useState(false)

  const handleDateRangeChange = (range: DateRange) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set("range", range)
    router.push(`/admin/ops/doctors?${params.toString()}`)
  }

  const handleSort = (field: SortField) => {
    const params = new URLSearchParams(searchParams.toString())
    
    // Toggle direction if same field, otherwise default to desc
    const newDirection = sortField === field && sortDirection === "desc" ? "asc" : "desc"
    
    params.set("sort", field)
    params.set("dir", newDirection)
    router.push(`/admin/ops/doctors?${params.toString()}`)
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

  const SortableHeader = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <TableHead>
      <button
        className="flex items-center font-medium hover:text-foreground transition-colors"
        onClick={() => handleSort(field)}
      >
        {children}
        <SortIcon field={field} />
      </button>
    </TableHead>
  )

  // Summary stats
  const totalDoctors = initialData.length
  const totalPending = initialData.reduce((sum, d) => sum + d.pending_count + d.in_review_count, 0)
  const totalDecisions = initialData.reduce((sum, d) => sum + d.total_decisions, 0)
  const totalBreaches = initialData.reduce((sum, d) => sum + d.sla_breaches, 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link 
            href="/admin/ops" 
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-1"
          >
            <ArrowLeft className="h-3 w-3 mr-1" />
            Back to Ops
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight">Doctor Ops</h1>
          <p className="text-muted-foreground">
            Operational metrics per doctor
          </p>
        </div>
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
      </div>

      {/* Error state */}
      {error && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <p className="text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Doctors</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalDoctors}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalPending}</div>
            <p className="text-xs text-muted-foreground">Across all doctors</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Decisions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalDecisions}</div>
            <p className="text-xs text-muted-foreground">Last {dateRange === "7d" ? "7" : "30"} days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">SLA Breaches</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${totalBreaches > 0 ? "text-destructive" : ""}`}>
              {totalBreaches}
            </div>
            <p className="text-xs text-muted-foreground">Last {dateRange === "7d" ? "7" : "30"} days</p>
          </CardContent>
        </Card>
      </div>

      {/* Data Table */}
      <Card>
        <CardContent className="p-0">
          <Table data-testid="doctor-ops-table">
            <TableHeader>
              <TableRow>
                <SortableHeader field="doctor_name">Doctor</SortableHeader>
                <SortableHeader field="pending_count">Pending</SortableHeader>
                <SortableHeader field="median_time_to_first_action_minutes">
                  Median First Action
                </SortableHeader>
                <SortableHeader field="median_time_to_decision_minutes">
                  Median Decision
                </SortableHeader>
                <SortableHeader field="total_decisions">Decisions</SortableHeader>
                <SortableHeader field="sla_breaches">SLA Breaches</SortableHeader>
              </TableRow>
            </TableHeader>
            <TableBody>
              {initialData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <Users className="h-8 w-8 text-muted-foreground" />
                      <span className="text-muted-foreground">
                        No doctor data available
                      </span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                initialData.map((doctor) => (
                  <TableRow key={doctor.doctor_id}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{doctor.doctor_name}</span>
                        {doctor.doctor_email && (
                          <span className="text-xs text-muted-foreground">
                            {doctor.doctor_email}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {doctor.pending_count + doctor.in_review_count}
                        </span>
                        {doctor.pending_count > 0 && (
                          <Badge variant="secondary" className="text-xs">
                            {doctor.pending_count} new
                          </Badge>
                        )}
                        {doctor.in_review_count > 0 && (
                          <Badge variant="outline" className="text-xs">
                            {doctor.in_review_count} in review
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={getTimeColor(doctor.median_time_to_first_action_minutes, 5)}>
                        {formatMinutes(doctor.median_time_to_first_action_minutes)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={getTimeColor(doctor.median_time_to_decision_minutes, 30)}>
                        {formatMinutes(doctor.median_time_to_decision_minutes)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{doctor.total_decisions}</span>
                        <span className="text-xs text-muted-foreground">
                          {doctor.approvals} approved, {doctor.declines} declined
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={doctor.sla_breaches > 0 ? "text-destructive font-medium" : ""}>
                        {doctor.sla_breaches}
                      </span>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Legend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Metrics Guide</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 text-sm">
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
        </CardContent>
      </Card>
    </div>
  )
}
