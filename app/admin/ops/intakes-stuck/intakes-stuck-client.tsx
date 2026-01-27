"use client"

/**
 * Stuck Intakes Admin Viewer
 * 
 * Displays intakes that are stuck in SLA-breaching states.
 * 
 * UI Location: /admin/ops/intakes-stuck
 */

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { RefreshCcw, ExternalLink, AlertTriangle, Clock, Mail, CheckCircle2, ArrowLeft } from "lucide-react"
import type { StuckIntake, StuckCounts, StuckReason } from "@/lib/data/intake-ops"

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

function formatAge(minutes: number): string {
  if (minutes < 60) {
    return `${Math.round(minutes)} min`
  }
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = Math.round(minutes % 60)
  if (hours < 24) {
    return `${hours}h ${remainingMinutes}m`
  }
  const days = Math.floor(hours / 24)
  const remainingHours = hours % 24
  return `${days}d ${remainingHours}h`
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

// ============================================================================
// COMPONENT
// ============================================================================

export function IntakesStuckClient({
  initialData,
  counts,
  serviceTypes,
  filters,
  error,
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
    router.push(`/admin/ops/intakes-stuck?${params.toString()}`)
  }

  const handleRefresh = () => {
    setIsRefreshing(true)
    router.refresh()
    setTimeout(() => setIsRefreshing(false), 1000)
  }

  const clearFilters = () => {
    router.push("/admin/ops/intakes-stuck")
  }

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
          <h1 className="text-2xl font-semibold tracking-tight">Stuck Intakes</h1>
          <p className="text-muted-foreground">
            Monitor intakes that are stuck in SLA-breaching states
          </p>
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

      {/* Error state */}
      {error && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <p className="text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Stuck</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{counts.total}</div>
          </CardContent>
        </Card>

        <button 
          type="button"
          className={`text-left w-full transition-colors ${filters.reason === "paid_no_review" ? "ring-2 ring-primary rounded-lg" : ""}`}
          onClick={() => handleFilterChange("reason", filters.reason === "paid_no_review" ? "all" : "paid_no_review")}
          aria-pressed={filters.reason === "paid_no_review"}
        >
          <Card className="cursor-pointer hover:bg-muted/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Paid, No Review</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{counts.paid_no_review}</div>
              <p className="text-xs text-muted-foreground">&gt; 5 min</p>
            </CardContent>
          </Card>
        </button>

        <button 
          type="button"
          className={`text-left w-full transition-colors ${filters.reason === "review_timeout" ? "ring-2 ring-primary rounded-lg" : ""}`}
          onClick={() => handleFilterChange("reason", filters.reason === "review_timeout" ? "all" : "review_timeout")}
          aria-pressed={filters.reason === "review_timeout"}
        >
          <Card className="cursor-pointer hover:bg-muted/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Review Timeout</CardTitle>
              <AlertTriangle className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{counts.review_timeout}</div>
              <p className="text-xs text-muted-foreground">&gt; 60 min</p>
            </CardContent>
          </Card>
        </button>

        <button 
          type="button"
          className={`text-left w-full transition-colors ${filters.reason === "delivery_pending" ? "ring-2 ring-primary rounded-lg" : ""}`}
          onClick={() => handleFilterChange("reason", filters.reason === "delivery_pending" ? "all" : "delivery_pending")}
          aria-pressed={filters.reason === "delivery_pending"}
        >
          <Card className="cursor-pointer hover:bg-muted/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Delivery Pending</CardTitle>
              <Mail className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{counts.delivery_pending}</div>
              <p className="text-xs text-muted-foreground">&gt; 10 min</p>
            </CardContent>
          </Card>
        </button>

        <button 
          type="button"
          className={`text-left w-full transition-colors ${filters.reason === "delivery_failed" ? "ring-2 ring-primary rounded-lg" : ""}`}
          onClick={() => handleFilterChange("reason", filters.reason === "delivery_failed" ? "all" : "delivery_failed")}
          aria-pressed={filters.reason === "delivery_failed"}
        >
          <Card className="cursor-pointer hover:bg-muted/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Delivery Failed</CardTitle>
              <AlertTriangle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{counts.delivery_failed}</div>
              <p className="text-xs text-muted-foreground">Email failed</p>
            </CardContent>
          </Card>
        </button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="w-48">
              <label className="text-sm font-medium mb-1.5 block">Reason</label>
              <Select
                value={filters.reason || "all"}
                onValueChange={(v) => handleFilterChange("reason", v)}
              >
                <SelectTrigger>
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
            </div>

            <div className="w-48">
              <label className="text-sm font-medium mb-1.5 block">Service Type</label>
              <Select
                value={filters.service_type || "all"}
                onValueChange={(v) => handleFilterChange("service_type", v)}
              >
                <SelectTrigger>
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
            </div>

            <div className="w-48">
              <label className="text-sm font-medium mb-1.5 block">Status</label>
              <Select
                value={filters.status || "all"}
                onValueChange={(v) => handleFilterChange("status", v)}
              >
                <SelectTrigger>
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
            </div>

            {(filters.reason || filters.service_type || filters.status) && (
              <div className="flex items-end">
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  Clear filters
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Data Table */}
      <Card>
        <CardContent className="p-0">
          <Table data-testid="stuck-intakes-table">
            <TableHeader>
              <TableRow>
                <TableHead>Reference</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Age</TableHead>
                <TableHead>Service</TableHead>
                <TableHead>Patient</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {initialData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <CheckCircle2 className="h-8 w-8 text-green-500" />
                      <span className="text-muted-foreground">
                        No stuck intakes found
                      </span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                initialData.map((intake) => (
                  <TableRow key={intake.id}>
                    <TableCell className="font-mono text-sm">
                      {intake.reference_number}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{intake.status}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getReasonBadgeVariant(intake.stuck_reason)}>
                        <span className="mr-1">{REASON_ICONS[intake.stuck_reason]}</span>
                        {REASON_LABELS[intake.stuck_reason]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className={intake.stuck_age_minutes > 60 ? "text-destructive font-medium" : ""}>
                        {formatAge(intake.stuck_age_minutes)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-sm">{intake.service_name || intake.category}</span>
                        {intake.subtype && (
                          <span className="text-xs text-muted-foreground">{intake.subtype}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-sm">{intake.patient_name || "Unknown"}</span>
                        <span className="text-xs text-muted-foreground">
                          {intake.patient_email || "No email"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href={`/doctor/intakes/${intake.id}`}>
                        <Button variant="ghost" size="sm">
                          <ExternalLink className="h-4 w-4 mr-1" />
                          Open
                        </Button>
                      </Link>
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
          <CardTitle className="text-base">SLA Thresholds</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
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
        </CardContent>
      </Card>
    </div>
  )
}
