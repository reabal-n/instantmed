"use client"

/**
 * Payments Reconciliation Dashboard
 * 
 * Identifies mismatches between Stripe payment and delivery outcome.
 * This is an ops lens, not accounting software.
 * 
 * UI Location: /admin/ops/reconciliation
 */

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
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
import { Snippet } from "@/components/uix"
import { 
  RefreshCcw, 
  ExternalLink, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  XCircle,
  CreditCard,
  ArrowLeft,
} from "lucide-react"
import type { ReconciliationRecord, DeliveryStatus } from "@/lib/data/reconciliation"

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
}

// ============================================================================
// HELPERS
// ============================================================================

function formatAge(minutes: number): string {
  if (minutes < 60) return `${Math.round(minutes)} min`
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = Math.round(minutes % 60)
  if (hours < 24) return `${hours}h ${remainingMinutes}m`
  const days = Math.floor(hours / 24)
  return `${days}d ${hours % 24}h`
}

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
}: ReconciliationClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isRefreshing, setIsRefreshing] = useState(false)

  const handleMismatchToggle = (checked: boolean) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set("mismatch_only", checked ? "true" : "false")
    router.push(`/admin/ops/reconciliation?${params.toString()}`)
  }

  const handleCategoryChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value && value !== "all") {
      params.set("category", value)
    } else {
      params.delete("category")
    }
    router.push(`/admin/ops/reconciliation?${params.toString()}`)
  }

  const handleRefresh = () => {
    setIsRefreshing(true)
    router.refresh()
    setTimeout(() => setIsRefreshing(false), 1000)
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
          <h1 className="text-2xl font-semibold tracking-tight">Payments Reconciliation</h1>
          <p className="text-muted-foreground">
            Identify mismatches between payment and delivery
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

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Records</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.total}</div>
          </CardContent>
        </Card>

        <Card className={summary.mismatches > 0 ? "border-destructive" : ""}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Mismatches</CardTitle>
            <AlertTriangle className={`h-4 w-4 ${summary.mismatches > 0 ? "text-destructive" : "text-muted-foreground"}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${summary.mismatches > 0 ? "text-destructive" : ""}`}>
              {summary.mismatches}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Delivered</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{summary.delivered}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.pending}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed</CardTitle>
            <XCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${summary.failed > 0 ? "text-destructive" : ""}`}>
              {summary.failed}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-6">
            <div className="flex items-center space-x-2">
              <Switch
                id="mismatch-only"
                checked={mismatchOnly}
                onCheckedChange={handleMismatchToggle}
                data-testid="mismatch-toggle"
              />
              <Label htmlFor="mismatch-only" className="font-medium">
                Mismatch only
              </Label>
            </div>

            <div className="w-48">
              <label className="text-sm font-medium mb-1.5 block">Category</label>
              <Select
                value={selectedCategory || "all"}
                onValueChange={handleCategoryChange}
              >
                <SelectTrigger>
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
          </div>
        </CardContent>
      </Card>

      {/* Data Table */}
      <Card>
        <CardContent className="p-0">
          <Table data-testid="reconciliation-table">
            <TableHeader>
              <TableRow>
                <TableHead>Reference</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Delivery</TableHead>
                <TableHead>Age</TableHead>
                <TableHead>Patient</TableHead>
                <TableHead>Error</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {initialData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <CheckCircle2 className="h-8 w-8 text-green-500" />
                      <span className="text-muted-foreground">
                        {mismatchOnly
                          ? "No mismatches found"
                          : "No records found"}
                      </span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                initialData.map((record) => {
                  const statusBadge = getDeliveryStatusBadge(record.delivery_status)
                  return (
                    <TableRow key={record.intake_id} className={record.is_mismatch ? "bg-destructive/5" : ""}>
                      <TableCell>
                        <Snippet symbol="" size="sm" variant="flat" className="bg-transparent">
                          {record.reference_number}
                        </Snippet>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-sm">{formatCategory(record.category || "Unknown")}</span>
                          {record.subtype && (
                            <span className="text-xs text-muted-foreground">{record.subtype}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{record.intake_status}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <Badge variant={statusBadge.variant} className="w-fit">
                            {statusBadge.icon}
                            {statusBadge.label}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {record.delivery_details}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={record.age_minutes > 60 ? "text-amber-600 font-medium" : ""}>
                          {formatAge(record.age_minutes)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-sm truncate max-w-[150px]">
                            {record.patient_name || "Unknown"}
                          </span>
                          <span className="text-xs text-muted-foreground truncate max-w-[150px]">
                            {record.patient_email || "No email"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {record.last_error ? (
                          <span className="text-xs text-destructive truncate block max-w-[150px]" title={record.last_error}>
                            {record.last_error}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Link href={`/doctor/intakes/${record.intake_id}`}>
                            <Button variant="ghost" size="sm">
                              <ExternalLink className="h-4 w-4 mr-1" />
                              Intake
                            </Button>
                          </Link>
                          <Link href={`/doctor/admin/email-outbox?intake_id=${record.intake_id}`}>
                            <Button variant="ghost" size="sm">
                              Emails
                            </Button>
                          </Link>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Legend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Delivery Status Guide</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 text-sm">
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
        </CardContent>
      </Card>
    </div>
  )
}
