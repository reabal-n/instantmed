"use client"

/**
 * Payments Reconciliation Dashboard
 *
 * Identifies mismatches between Stripe payment and delivery outcome.
 * This is an ops lens, not accounting software.
 *
 * Shared component - use basePath to control URL prefix.
 */

import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  ExternalLink,
  RefreshCcw,
  XCircle,
} from "lucide-react"
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
import { Switch } from "@/components/ui/switch"
import { buildAdminIntakeHref, buildStaffEmailHubHref } from "@/lib/dashboard/routes"
import type { DeliveryStatus,ReconciliationRecord } from "@/lib/data/reconciliation"
import { formatAge } from "@/lib/format"
import { cn } from "@/lib/utils"

// ============================================================================
// PROPS
// ============================================================================

interface ReconciliationClientProps {
  initialData: ReconciliationRecord[]
  summary: {
    total: number
    mismatches: number
    delivered: number
    pending: number
    failed: number
  }
  categories: string[]
  mismatchOnly: boolean
  selectedCategory?: string
  error?: string
  basePath?: string
}

// ============================================================================
// HELPERS
// ============================================================================

function getDeliveryStatusBadge(status: DeliveryStatus): {
  variant: "default" | "secondary" | "destructive" | "outline"
  icon: React.ReactNode
  label: string
} {
  switch (status) {
    case "delivered":
      return {
        variant: "default",
        icon: <CheckCircle2 className="h-3 w-3 mr-1" />,
        label: "Delivered",
      }
    case "pending":
      return {
        variant: "secondary",
        icon: <Clock className="h-3 w-3 mr-1" />,
        label: "Pending",
      }
    case "in_progress":
      return {
        variant: "outline",
        icon: <Clock className="h-3 w-3 mr-1" />,
        label: "In Progress",
      }
    case "failed":
      return {
        variant: "destructive",
        icon: <XCircle className="h-3 w-3 mr-1" />,
        label: "Failed",
      }
    case "not_applicable":
      return {
        variant: "outline",
        icon: null,
        label: "N/A",
      }
    default:
      return {
        variant: "outline",
        icon: null,
        label: status,
      }
  }
}

function formatCategory(category: string): string {
  return category
    .replace(/_/g, " ")
    .replace(/\b\w/g, c => c.toUpperCase())
}

// ============================================================================
// COMPONENT
// ============================================================================

export function ReconciliationClient({
  initialData,
  summary,
  categories,
  mismatchOnly,
  selectedCategory,
  error,
  basePath = "/admin/ops",
}: ReconciliationClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isRefreshing, setIsRefreshing] = useState(false)

  const handleMismatchToggle = (checked: boolean) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set("mismatch_only", checked ? "true" : "false")
    router.push(`${basePath}/reconciliation?${params.toString()}`)
  }

  const handleCategoryChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value && value !== "all") {
      params.set("category", value)
    } else {
      params.delete("category")
    }
    router.push(`${basePath}/reconciliation?${params.toString()}`)
  }

  const handleRefresh = () => {
    setIsRefreshing(true)
    router.refresh()
    setTimeout(() => setIsRefreshing(false), 1000)
  }

  return (
    <OperatorPage>
      <OperatorPageHeader
        title="Payment reconciliation"
        description="Payment and delivery mismatches that need operator review."
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
        <Badge variant={summary.mismatches > 0 ? "destructive" : "success"} className="h-8 px-3">
          {summary.mismatches > 0 ? `${summary.mismatches} mismatch` : "Clear"}
        </Badge>
        {[
          { label: "Records", value: summary.total, icon: null },
          { label: "Delivered", value: summary.delivered, icon: <CheckCircle2 className="h-3.5 w-3.5 text-success" /> },
          { label: "Pending", value: summary.pending, icon: <Clock className="h-3.5 w-3.5 text-muted-foreground" /> },
          { label: "Failed", value: summary.failed, icon: <XCircle className="h-3.5 w-3.5 text-destructive" /> },
        ].map((item) => (
          <span
            key={item.label}
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border/50 bg-background px-2.5 text-xs font-semibold text-muted-foreground"
          >
            {item.icon}
            {item.label}
            <span className="tabular-nums text-foreground">{item.value}</span>
          </span>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border/50 bg-card px-3 py-2 shadow-sm shadow-primary/[0.03]">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Filters</span>
        <label className="flex h-8 items-center gap-2 rounded-md border border-border/50 bg-background px-2.5 text-xs font-semibold text-muted-foreground">
          <Switch
            id="mismatch-only"
            checked={mismatchOnly}
            onCheckedChange={handleMismatchToggle}
            data-testid="mismatch-toggle"
          />
          Mismatch only
        </label>

        <Select
          value={selectedCategory || "all"}
          onValueChange={handleCategoryChange}
        >
          <SelectTrigger className="h-8 w-[180px] text-xs">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {formatCategory(cat)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Task rows */}
      <Card>
        <CardContent className="p-0">
          <div data-testid="reconciliation-task-list" className="divide-y divide-border/50">
            {initialData.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
                <CheckCircle2 className="h-8 w-8 text-success" />
                <span className="text-sm text-muted-foreground">
                  {mismatchOnly ? "No mismatches found" : "No records found"}
                </span>
              </div>
            ) : (
              initialData.map((record) => {
                const statusBadge = getDeliveryStatusBadge(record.delivery_status)
                return (
                  <div
                    key={record.intake_id}
                    className={cn(
                      "grid gap-3 px-3 py-3 transition-colors hover:bg-muted/35 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)_auto] lg:items-center",
                      record.is_mismatch && "bg-destructive/5",
                    )}
                  >
                    <div className="min-w-0">
                      <div className="flex min-w-0 flex-wrap items-center gap-2">
                        <span className="truncate font-mono text-sm font-semibold text-foreground">
                          {record.reference_number}
                        </span>
                        {record.is_mismatch && (
                          <Badge variant="destructive">
                            <AlertTriangle className="h-3 w-3" />
                            Mismatch
                          </Badge>
                        )}
                        <Badge variant="outline">{record.intake_status}</Badge>
                        <Badge variant={statusBadge.variant}>
                          {statusBadge.icon}
                          {statusBadge.label}
                        </Badge>
                      </div>
                      <p className="mt-1 truncate text-sm text-muted-foreground">
                        {record.patient_name || "Unknown patient"} · {record.patient_email || "No email"}
                      </p>
                    </div>
                    <div className="min-w-0 text-sm">
                      <p className="truncate font-medium text-foreground">
                        {formatCategory(record.category || "Unknown")}
                        {record.subtype ? ` · ${record.subtype}` : ""}
                      </p>
                      <p className={cn("mt-1 truncate text-xs", record.age_minutes > 60 ? "font-medium text-warning" : "text-muted-foreground")}>
                        {statusBadge.label}: {record.delivery_details} · {formatAge(record.age_minutes)}
                      </p>
                      {record.last_error && (
                        <p className="mt-1 truncate text-xs text-destructive" title={record.last_error}>
                          {record.last_error}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2 lg:justify-end">
                      <Button asChild variant="ghost" size="sm">
                        <Link href={buildAdminIntakeHref(record.intake_id)}>
                          <ExternalLink className="h-4 w-4" />
                          Intake
                        </Link>
                      </Button>
                      <Button asChild variant="ghost" size="sm">
                        <Link href={buildStaffEmailHubHref({ tab: "queue", intakeId: record.intake_id })}>
                          Emails
                        </Link>
                      </Button>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </CardContent>
      </Card>

      {/* Legend */}
      <details className="rounded-xl border border-border/50 bg-card shadow-sm shadow-primary/[0.03]">
        <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-muted-foreground">
          Delivery status guide
        </summary>
        <div className="border-t border-border/50 px-4 py-3">
          <div className="grid gap-3 text-sm md:grid-cols-2">
            <div>
              <div className="font-medium">Medical Certificate</div>
              <div className="text-muted-foreground">
                Delivered = Approved + Document exists + Email sent
              </div>
            </div>
            <div>
              <div className="font-medium">Prescription</div>
              <div className="text-muted-foreground">
                Delivered = Script sent email or script_sent marker
              </div>
            </div>
            <div>
              <div className="font-medium">Consult</div>
              <div className="text-muted-foreground">
                Delivered = Status progressed beyond &quot;paid&quot; (clinical delivery)
              </div>
            </div>
            <div>
              <div className="font-medium">Mismatch</div>
              <div className="text-muted-foreground">
                Payment received &gt;15 min ago but delivery not confirmed
              </div>
            </div>
          </div>
        </div>
      </details>
      </OperatorScrollArea>
    </OperatorPage>
  )
}
