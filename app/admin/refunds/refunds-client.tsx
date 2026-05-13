"use client"

import {
  AlertTriangle,
  CheckCircle,
  Clock,
  CreditCard,
  Eye,
  Loader2,
  Search,
  XCircle,
} from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useCallback, useMemo, useState } from "react"
import { toast } from "sonner"

import {
  getPaymentsWithRefundsAction,
  markRefundNotEligibleAction,
  processRefundAction,
} from "@/app/actions/admin-config"
import { OperatorSplitPane } from "@/components/operator"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Pagination, Skeleton } from "@/components/uix"
import { buildAdminIntakeHref } from "@/lib/dashboard/routes"
import type { PaymentWithRefund, RefundFilters } from "@/lib/data/types/refunds"
import { formatAmount, formatRefundStatus, getRefundStatuses } from "@/lib/data/types/refunds"
import { cn } from "@/lib/utils"

interface RefundsClientProps {
  initialPayments: PaymentWithRefund[]
  initialTotal: number
  initialStatusFilter?: string
  stats: {
    eligible: number
    processing: number
    refunded: number
    failed: number
    totalRefunded: number
  }
}

const REFUND_STATUSES = getRefundStatuses()

function getStatusBadge(status: string) {
  switch (status) {
    case "eligible":
      return <Badge className="bg-warning-light text-warning"><Clock className="mr-1 h-3 w-3" />Eligible</Badge>
    case "processing":
      return <Badge className="bg-info-light text-info">Processing</Badge>
    case "refunded":
      return <Badge className="bg-success-light text-success"><CheckCircle className="mr-1 h-3 w-3" />Refunded</Badge>
    case "failed":
      return <Badge className="bg-destructive-light text-destructive"><XCircle className="mr-1 h-3 w-3" />Failed</Badge>
    case "not_eligible":
      return <Badge variant="secondary">Not eligible</Badge>
    default:
      return <Badge variant="outline">{formatRefundStatus(status)}</Badge>
  }
}

function getPatientName(payment: PaymentWithRefund) {
  return payment.intake?.patient?.full_name || "Unknown patient"
}

function getServiceName(payment: PaymentWithRefund) {
  return payment.intake?.service?.short_name || payment.intake?.service?.name || "Unknown service"
}

export function RefundsClient({
  initialPayments,
  initialTotal,
  initialStatusFilter,
  stats,
}: RefundsClientProps) {
  const router = useRouter()
  const [payments, setPayments] = useState(initialPayments)
  const [total, setTotal] = useState(initialTotal)
  const [page, setPage] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [selectedPaymentId, setSelectedPaymentId] = useState<string | null>(initialPayments[0]?.id || null)
  const [isProcessDialogOpen, setIsProcessDialogOpen] = useState(false)
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [refundReason, setRefundReason] = useState("")
  const [query, setQuery] = useState("")
  const pageSize = 50

  const [filters, setFilters] = useState<RefundFilters>({
    status: initialStatusFilter,
  })
  const failedRefundsOnly = filters.status === "failed"

  const selectedPayment = payments.find((payment) => payment.id === selectedPaymentId) || payments[0] || null

  const filteredPayments = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    if (!normalizedQuery) return payments

    return payments.filter((payment) => [
      getPatientName(payment),
      payment.intake?.patient?.email || "",
      getServiceName(payment),
      payment.id,
      payment.intake?.id || "",
    ].some((value) => value.toLowerCase().includes(normalizedQuery)))
  }, [payments, query])

  const fetchPayments = useCallback(async (newFilters: RefundFilters, newPage: number) => {
    setIsLoading(true)
    try {
      const result = await getPaymentsWithRefundsAction(newFilters, newPage, pageSize)
      setPayments(result.data)
      setTotal(result.total)
      setPage(newPage)
      setSelectedPaymentId(result.data[0]?.id || null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const handleFilterChange = (key: keyof RefundFilters, value: string | undefined) => {
    const newFilters = { ...filters, [key]: value === "all" ? undefined : value }
    setFilters(newFilters)
    fetchPayments(newFilters, 1)
  }

  const handleProcessRefund = async () => {
    if (!selectedPayment) return

    setIsProcessing(true)
    try {
      const result = await processRefundAction(
        selectedPayment.id,
        selectedPayment.amount,
        selectedPayment.intake?.id,
      )

      if (result.success) {
        toast.success("Refund processed")
        setIsProcessDialogOpen(false)
        fetchPayments(filters, page)
        router.refresh()
      } else {
        toast.error(result.error || "Failed to process refund")
      }
    } catch {
      toast.error("Failed to process refund")
    } finally {
      setIsProcessing(false)
    }
  }

  const handleRejectRefund = async () => {
    if (!selectedPayment || !refundReason.trim()) {
      toast.error("Add a reason first")
      return
    }

    setIsProcessing(true)
    try {
      const result = await markRefundNotEligibleAction(selectedPayment.id, refundReason)

      if (result.success) {
        toast.success("Refund request rejected")
        setIsRejectDialogOpen(false)
        setRefundReason("")
        fetchPayments(filters, page)
        router.refresh()
      } else {
        toast.error(result.error || "Failed to reject refund")
      }
    } catch {
      toast.error("Failed to reject refund")
    } finally {
      setIsProcessing(false)
    }
  }

  const totalPages = Math.ceil(total / pageSize)

  const list = (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 border-b border-border/50 px-4 py-3">
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-foreground">Refund work</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {failedRefundsOnly ? "Failed refunds only." : "Eligible, failed, and completed refunds."}
              </p>
            </div>
            {stats.failed > 0 ? (
              <Badge variant="destructive" className="shrink-0">Failed</Badge>
            ) : (
              <Badge variant="secondary" className="shrink-0">All statuses</Badge>
            )}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Find patient or intake"
              startContent={<Search className="h-4 w-4 text-muted-foreground" />}
              className="sm:flex-1"
            />
            <Select
              value={filters.status || "all"}
              onValueChange={(value) => handleFilterChange("status", value)}
            >
              <SelectTrigger className="sm:w-[180px]" aria-label="Refund status">
                <SelectValue placeholder="Refund status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {REFUND_STATUSES.map((status) => (
                  <SelectItem key={status.value} value={status.value}>
                    {status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="space-y-2 border-b border-border/50 px-4 py-3">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-3 w-28" />
            </div>
          ))
        ) : filteredPayments.length > 0 ? (
          <div className="divide-y divide-border/50">
            {filteredPayments.map((payment) => {
              const active = selectedPayment?.id === payment.id
              return (
                <button
                  key={payment.id}
                  type="button"
                  onClick={() => setSelectedPaymentId(payment.id)}
                  className={cn(
                    "block w-full px-4 py-3 text-left transition-colors",
                    active ? "bg-primary/5" : "hover:bg-muted/40",
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">{getPatientName(payment)}</p>
                      <p className="mt-1 truncate text-xs text-muted-foreground">{getServiceName(payment)}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {new Date(payment.created_at).toLocaleDateString("en-AU")}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-2">
                      {getStatusBadge(payment.refund_status)}
                      <span className="font-mono text-xs text-foreground">{formatAmount(payment.amount)}</span>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        ) : (
          <div className="flex h-full min-h-48 flex-col items-center justify-center px-6 text-center">
            <CheckCircle className="h-8 w-8 text-success" />
            <p className="mt-3 text-sm font-medium text-foreground">No refunds in this view</p>
            <p className="mt-1 text-xs text-muted-foreground">Change the filter or search another patient.</p>
          </div>
        )}
      </div>

      {totalPages > 1 ? (
        <div className="shrink-0 border-t border-border/50 px-3 py-2">
          <Pagination
            total={totalPages}
            page={page}
            onChange={(newPage) => fetchPayments(filters, newPage)}
            showControls
            size="sm"
          />
        </div>
      ) : null}
    </div>
  )

  const detail = (
    <div className="flex h-full min-h-0 flex-col">
      {selectedPayment ? (
        <>
          <div className="shrink-0 border-b border-border/50 px-5 py-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div className="min-w-0">
                <h2 className="truncate text-base font-semibold text-foreground">{getPatientName(selectedPayment)}</h2>
                <p className="mt-1 truncate text-sm text-muted-foreground">{getServiceName(selectedPayment)}</p>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                {selectedPayment.refund_status === "eligible" ? (
                  <>
                    <Button type="button" size="sm" onClick={() => setIsProcessDialogOpen(true)}>
                      <CheckCircle className="mr-1.5 h-3.5 w-3.5" />
                      Refund
                    </Button>
                    <Button type="button" size="sm" variant="outline" onClick={() => setIsRejectDialogOpen(true)}>
                      <XCircle className="mr-1.5 h-3.5 w-3.5" />
                      Reject
                    </Button>
                  </>
                ) : null}
                {selectedPayment.refund_status === "failed" && selectedPayment.intake?.id ? (
                  <Button type="button" size="sm" variant="outline" asChild>
                    <Link href={buildAdminIntakeHref(selectedPayment.intake.id)}>
                      <Eye className="mr-1.5 h-3.5 w-3.5" />
                      Open intake
                    </Link>
                  </Button>
                ) : null}
              </div>
            </div>
          </div>

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
            {failedRefundsOnly ? (
              <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">
                Failed refunds are the only rows shown. Open the intake if payment state needs manual reconciliation.
              </div>
            ) : null}

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Amount</p>
                <p className="mt-1 text-lg font-semibold text-foreground">{formatAmount(selectedPayment.amount)}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Status</p>
                <div className="mt-1">{getStatusBadge(selectedPayment.refund_status)}</div>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Patient email</p>
                <p className="mt-1 truncate text-sm text-foreground">{selectedPayment.intake?.patient?.email || "Not recorded"}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Created</p>
                <p className="mt-1 text-sm text-foreground">
                  {new Date(selectedPayment.created_at).toLocaleDateString("en-AU")}
                </p>
              </div>
            </div>

            <div className="rounded-lg border border-border/50 bg-muted/20 p-3">
              <p className="text-xs font-medium text-muted-foreground">Refund reason</p>
              <p className="mt-1 text-sm text-foreground">
                {selectedPayment.refund_reason || "Request declined"}
              </p>
            </div>

            {selectedPayment.intake?.id ? (
              <div className="rounded-lg border border-border/50 bg-muted/20 p-3">
                <p className="text-xs font-medium text-muted-foreground">Linked intake</p>
                <p className="mt-1 break-all font-mono text-xs text-foreground">{selectedPayment.intake.id}</p>
              </div>
            ) : null}
          </div>
        </>
      ) : (
        <div className="flex h-full min-h-48 flex-col items-center justify-center px-6 text-center">
          <CreditCard className="h-8 w-8 text-muted-foreground" />
          <p className="mt-3 text-sm font-medium text-foreground">Select a refund</p>
          <p className="mt-1 text-xs text-muted-foreground">Patient and payment details will appear here.</p>
        </div>
      )}
    </div>
  )

  return (
    <>
      <div className="flex min-h-0 flex-1 flex-col gap-3">
        {failedRefundsOnly ? (
          <div className="rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            Only showing failed refund rows. Open these first, then return to all statuses when clear.
          </div>
        ) : null}
        <OperatorSplitPane list={list} detail={detail} />
      </div>

      <Dialog open={isProcessDialogOpen} onOpenChange={setIsProcessDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Process refund
            </DialogTitle>
            <DialogDescription>
              This refunds the full payment amount to the original payment method.
            </DialogDescription>
          </DialogHeader>
          {selectedPayment ? (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4 rounded-lg bg-muted p-4 text-sm">
                <div>
                  <Label className="text-muted-foreground">Patient</Label>
                  <p className="font-medium">{getPatientName(selectedPayment)}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Amount</Label>
                  <p className="font-medium">{formatAmount(selectedPayment.amount)}</p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-lg border border-warning-border bg-warning-light p-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 text-warning" />
                <p className="text-sm text-warning">This action cannot be undone in InstantMed.</p>
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsProcessDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleProcessRefund} disabled={isProcessing}>
              {isProcessing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle className="mr-2 h-4 w-4" />
              )}
              Process refund
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-destructive" />
              Reject refund request
            </DialogTitle>
            <DialogDescription>
              Mark this payment as not eligible and record the reason.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="space-y-2">
              <Label htmlFor="reject-reason">Reason</Label>
              <Textarea
                id="reject-reason"
                value={refundReason}
                onChange={(event) => setRefundReason(event.target.value)}
                placeholder="Service was delivered as requested..."
                className="min-h-[100px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRejectDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRejectRefund}
              disabled={isProcessing || !refundReason.trim()}
            >
              {isProcessing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <XCircle className="mr-2 h-4 w-4" />
              )}
              Reject request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
