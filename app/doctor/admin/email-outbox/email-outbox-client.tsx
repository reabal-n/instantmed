"use client"

import { useState, useTransition } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import {
  Mail,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  X,
  ExternalLink,
  Copy,
  Check,
  AlertCircle,
  CheckCircle,
  Clock,
  TestTube,
  ArrowLeft,
  RefreshCw,
  Loader2,
} from "lucide-react"
import { retryOutboxEmail } from "@/app/actions/email-retry"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { EmailOutboxRow } from "@/lib/data/email-outbox"

// ============================================================================
// TYPES
// ============================================================================

interface EmailOutboxClientProps {
  initialData: EmailOutboxRow[]
  totalRows: number
  currentPage: number
  pageSize: number
  emailTypes: string[]
  stats: {
    total: number
    sent: number
    failed: number
    skipped_e2e: number
    pending: number
  }
  filters: {
    status?: string
    email_type?: string
    to_email?: string
    intake_id?: string
  }
  error?: string
}

// ============================================================================
// HELPERS
// ============================================================================

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleString("en-AU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function truncateEmail(email: string, maxLength = 30): string {
  if (email.length <= maxLength) return email
  const [local, domain] = email.split("@")
  if (!domain) return email.slice(0, maxLength) + "..."
  const truncatedLocal = local.slice(0, maxLength - domain.length - 4) + "..."
  return `${truncatedLocal}@${domain}`
}

function truncateId(id: string | null): string {
  if (!id) return "-"
  return id.slice(0, 8) + "..."
}

// ============================================================================
// STATUS BADGE
// ============================================================================

function StatusBadge({ status }: { status: EmailOutboxRow["status"] }) {
  const config = {
    sent: { icon: CheckCircle, className: "bg-emerald-100 text-emerald-800" },
    failed: { icon: AlertCircle, className: "bg-red-100 text-red-800" },
    pending: { icon: Clock, className: "bg-amber-100 text-amber-800" },
    skipped_e2e: { icon: TestTube, className: "bg-purple-100 text-purple-800" },
  }

  const { icon: Icon, className } = config[status] || config.pending

  return (
    <Badge variant="secondary" className={`gap-1 ${className}`}>
      <Icon className="h-3 w-3" />
      {status}
    </Badge>
  )
}

// ============================================================================
// STATS CARDS
// ============================================================================

function StatsCards({
  stats,
}: {
  stats: EmailOutboxClientProps["stats"]
}) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
      <Card className="p-3">
        <div className="text-2xl font-bold">{stats.total}</div>
        <div className="text-xs text-muted-foreground">Total</div>
      </Card>
      <Card className="p-3">
        <div className="text-2xl font-bold text-emerald-600">{stats.sent}</div>
        <div className="text-xs text-muted-foreground">Sent</div>
      </Card>
      <Card className="p-3">
        <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
        <div className="text-xs text-muted-foreground">Failed</div>
      </Card>
      <Card className="p-3">
        <div className="text-2xl font-bold text-amber-600">{stats.pending}</div>
        <div className="text-xs text-muted-foreground">Pending</div>
      </Card>
      <Card className="p-3">
        <div className="text-2xl font-bold text-purple-600">
          {stats.skipped_e2e}
        </div>
        <div className="text-xs text-muted-foreground">E2E Skipped</div>
      </Card>
    </div>
  )
}

// ============================================================================
// FILTERS
// ============================================================================

function Filters({
  filters,
  emailTypes,
  onFilterChange,
  onClearFilters,
}: {
  filters: EmailOutboxClientProps["filters"]
  emailTypes: string[]
  onFilterChange: (key: string, value: string) => void
  onClearFilters: () => void
}) {
  const hasFilters = Object.values(filters).some(Boolean)

  return (
    <div className="flex flex-wrap gap-3 items-end">
      <div className="flex-1 min-w-[200px]">
        <label className="text-xs text-muted-foreground mb-1 block">
          Search email
        </label>
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Email address..."
            value={filters.to_email || ""}
            onChange={(e) => onFilterChange("to_email", e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      <div className="w-[140px]">
        <label className="text-xs text-muted-foreground mb-1 block">
          Status
        </label>
        <Select
          value={filters.status || "all"}
          onValueChange={(v) => onFilterChange("status", v === "all" ? "" : v)}
        >
          <SelectTrigger>
            <SelectValue placeholder="All" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="sent">Sent</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="skipped_e2e">E2E Skipped</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="w-[180px]">
        <label className="text-xs text-muted-foreground mb-1 block">
          Email Type
        </label>
        <Select
          value={filters.email_type || "all"}
          onValueChange={(v) =>
            onFilterChange("email_type", v === "all" ? "" : v)
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="All" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {emailTypes.map((type) => (
              <SelectItem key={type} value={type}>
                {type.replace(/_/g, " ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="w-[200px]">
        <label className="text-xs text-muted-foreground mb-1 block">
          Intake ID
        </label>
        <Input
          placeholder="Exact intake ID..."
          value={filters.intake_id || ""}
          onChange={(e) => onFilterChange("intake_id", e.target.value)}
        />
      </div>

      {hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearFilters}
          className="gap-1"
        >
          <X className="h-4 w-4" />
          Clear
        </Button>
      )}
    </div>
  )
}

// ============================================================================
// DETAIL MODAL
// ============================================================================

function DetailModal({
  row,
  onClose,
  onRetrySuccess,
}: {
  row: EmailOutboxRow | null
  onClose: () => void
  onRetrySuccess?: () => void
}) {
  const [copied, setCopied] = useState(false)
  const [isRetrying, setIsRetrying] = useState(false)
  const [retryResult, setRetryResult] = useState<{ success: boolean; error?: string } | null>(null)

  if (!row) return null

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleRetry = async () => {
    setIsRetrying(true)
    setRetryResult(null)
    try {
      const result = await retryOutboxEmail(row.id, true)
      setRetryResult(result)
      if (result.success) {
        onRetrySuccess?.()
        setTimeout(() => onClose(), 1500)
      }
    } finally {
      setIsRetrying(false)
    }
  }

  const canRetry = row.status === "failed" && (row.retry_count ?? 0) < 10

  return (
    <Dialog open={!!row} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Email Details
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Status and Meta */}
          <div className="flex flex-wrap gap-4 items-center">
            <StatusBadge status={row.status} />
            <span className="text-sm text-muted-foreground">
              {formatDate(row.created_at)}
            </span>
            {row.sent_at && (
              <span className="text-sm text-muted-foreground">
                Sent: {formatDate(row.sent_at)}
              </span>
            )}
            {row.retry_count !== undefined && row.retry_count > 0 && (
              <span className="text-sm text-muted-foreground">
                Attempts: {row.retry_count}
              </span>
            )}
          </div>

          {/* Retry Button for Failed Emails */}
          {canRetry && (
            <div className="flex items-center gap-3">
              <Button
                onClick={handleRetry}
                disabled={isRetrying}
                variant="outline"
                className="gap-2"
              >
                {isRetrying ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                {isRetrying ? "Sending..." : "Resend Now"}
              </Button>
              {retryResult && (
                <span className={retryResult.success ? "text-emerald-600 text-sm" : "text-red-600 text-sm"}>
                  {retryResult.success ? "Sent successfully!" : retryResult.error}
                </span>
              )}
            </div>
          )}

          {/* Core Fields */}
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm">Email Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="grid grid-cols-[100px_1fr] gap-2">
                <span className="text-muted-foreground">To:</span>
                <span className="font-mono">{row.to_email}</span>
              </div>
              {row.to_name && (
                <div className="grid grid-cols-[100px_1fr] gap-2">
                  <span className="text-muted-foreground">Name:</span>
                  <span>{row.to_name}</span>
                </div>
              )}
              <div className="grid grid-cols-[100px_1fr] gap-2">
                <span className="text-muted-foreground">Subject:</span>
                <span>{row.subject}</span>
              </div>
              <div className="grid grid-cols-[100px_1fr] gap-2">
                <span className="text-muted-foreground">Type:</span>
                <Badge variant="outline">{row.email_type}</Badge>
              </div>
              <div className="grid grid-cols-[100px_1fr] gap-2">
                <span className="text-muted-foreground">Provider:</span>
                <span>{row.provider}</span>
              </div>
            </CardContent>
          </Card>

          {/* Provider Message ID */}
          {row.provider_message_id && (
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm">Provider Message ID</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <code className="text-xs bg-muted p-2 rounded flex-1 overflow-x-auto">
                    {row.provider_message_id}
                  </code>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCopy(row.provider_message_id!)}
                  >
                    {copied ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Error Message */}
          {row.error_message && (
            <Card className="border-red-200 bg-red-50">
              <CardHeader className="py-3">
                <CardTitle className="text-sm text-red-800">Error</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="text-xs text-red-800 whitespace-pre-wrap overflow-x-auto">
                  {row.error_message}
                </pre>
              </CardContent>
            </Card>
          )}

          {/* Links */}
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm">Related</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {row.intake_id && (
                <Link
                  href={`/doctor/intakes/${row.intake_id}`}
                  className="flex items-center gap-2 text-sm text-primary hover:underline"
                >
                  <ExternalLink className="h-4 w-4" />
                  Open Intake
                </Link>
              )}
              {row.certificate_id && (
                <div className="text-sm text-muted-foreground">
                  Certificate ID: {truncateId(row.certificate_id)}
                </div>
              )}
              {row.patient_id && (
                <div className="text-sm text-muted-foreground">
                  Patient ID: {truncateId(row.patient_id)}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Metadata */}
          {row.metadata && Object.keys(row.metadata).length > 0 && (
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm">Metadata</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="text-xs bg-muted p-3 rounded overflow-x-auto">
                  {JSON.stringify(row.metadata, null, 2)}
                </pre>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function EmailOutboxClient({
  initialData,
  totalRows,
  currentPage,
  pageSize,
  emailTypes,
  stats,
  filters: initialFilters,
  error,
}: EmailOutboxClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const [selectedRow, setSelectedRow] = useState<EmailOutboxRow | null>(null)

  const totalPages = Math.ceil(totalRows / pageSize)

  const updateSearchParams = (updates: Record<string, string>) => {
    const params = new URLSearchParams(searchParams.toString())
    Object.entries(updates).forEach(([key, value]) => {
      if (value) {
        params.set(key, value)
      } else {
        params.delete(key)
      }
    })
    // Reset to page 1 when filters change (except for page changes)
    if (!("page" in updates)) {
      params.delete("page")
    }
    startTransition(() => {
      router.push(`?${params.toString()}`)
    })
  }

  const handleFilterChange = (key: string, value: string) => {
    updateSearchParams({ [key]: value })
  }

  const handleClearFilters = () => {
    startTransition(() => {
      router.push("?")
    })
  }

  const handlePageChange = (newPage: number) => {
    updateSearchParams({ page: newPage.toString() })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link 
            href="/doctor/admin/ops"
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-1"
          >
            <ArrowLeft className="h-3 w-3 mr-1" />
            Back to Ops
          </Link>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Mail className="h-6 w-6" />
            Email Outbox
          </h1>
          <p className="text-muted-foreground text-sm">
            View and debug transactional email delivery
          </p>
        </div>
      </div>

      {/* Stats */}
      <StatsCards stats={stats} />

      {/* Filters */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Filters
            filters={initialFilters}
            emailTypes={emailTypes}
            onFilterChange={handleFilterChange}
            onClearFilters={handleClearFilters}
          />
        </CardContent>
      </Card>

      {/* Error State */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="py-4">
            <div className="flex items-center gap-2 text-red-800">
              <AlertCircle className="h-5 w-5" />
              <span>Query failed: {error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" data-testid="email-outbox-table">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-medium">Created</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-left font-medium">Type</th>
                <th className="px-4 py-3 text-left font-medium">To</th>
                <th className="px-4 py-3 text-left font-medium">Subject</th>
                <th className="px-4 py-3 text-left font-medium">Intake</th>
                <th className="px-4 py-3 text-left font-medium">Provider</th>
                <th className="px-4 py-3 text-left font-medium">Error</th>
              </tr>
            </thead>
            <tbody className={isPending ? "opacity-50" : ""}>
              {initialData.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                    No emails found
                  </td>
                </tr>
              ) : (
                initialData.map((row) => (
                  <tr
                    key={row.id}
                    onClick={() => setSelectedRow(row)}
                    className="border-b hover:bg-muted/50 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3 whitespace-nowrap">
                      {formatDate(row.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={row.status} />
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className="font-mono text-xs">
                        {row.email_type}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">
                      {truncateEmail(row.to_email)}
                    </td>
                    <td className="px-4 py-3 max-w-[200px] truncate">
                      {row.subject}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">
                      {truncateId(row.intake_id)}
                    </td>
                    <td className="px-4 py-3 text-xs">{row.provider}</td>
                    <td className="px-4 py-3 max-w-[150px] truncate text-red-600">
                      {row.error_message || "-"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t">
            <div className="text-sm text-muted-foreground">
              Page {currentPage} of {totalPages} ({totalRows} total)
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage <= 1 || isPending}
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage >= totalPages || isPending}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Detail Modal */}
      <DetailModal 
        row={selectedRow} 
        onClose={() => setSelectedRow(null)}
        onRetrySuccess={() => router.refresh()}
      />
    </div>
  )
}
