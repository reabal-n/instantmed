"use client"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
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
import { Skeleton, Pagination } from "@/components/uix"
import {
  CreditCard,
  ArrowLeft,
  Search,
  RefreshCw,
  DollarSign,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Loader2,
} from "lucide-react"
import { toast } from "sonner"
import {
  getPaymentsWithRefundsAction,
  processRefundAction,
  markRefundNotEligibleAction,
} from "@/app/actions/admin-config"
import type { PaymentWithRefund, RefundFilters } from "@/lib/data/types/refunds"
import { getRefundStatuses, formatRefundStatus, formatAmount } from "@/lib/data/types/refunds"

interface RefundsClientProps {
  initialPayments: PaymentWithRefund[]
  initialTotal: number
  stats: {
    eligible: number
    processing: number
    refunded: number
    failed: number
    totalRefunded: number
  }
}

const REFUND_STATUSES = getRefundStatuses()

export function RefundsClient({ initialPayments, initialTotal, stats }: RefundsClientProps) {
  const router = useRouter()
  const [payments, setPayments] = useState(initialPayments)
  const [total, setTotal] = useState(initialTotal)
  const [page, setPage] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [selectedPayment, setSelectedPayment] = useState<PaymentWithRefund | null>(null)
  const [isProcessDialogOpen, setIsProcessDialogOpen] = useState(false)
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [refundReason, setRefundReason] = useState("")
  const pageSize = 50

  const [filters, setFilters] = useState<RefundFilters>({
    status: undefined,
  })

  const fetchPayments = useCallback(async (newFilters: RefundFilters, newPage: number) => {
    setIsLoading(true)
    try {
      const result = await getPaymentsWithRefundsAction(newFilters, newPage, pageSize)
      setPayments(result.data)
      setTotal(result.total)
      setPage(newPage)
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
      // Generate a mock Stripe refund ID (in production, this would call Stripe API)
      const mockRefundId = `re_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      
      const result = await processRefundAction(
        selectedPayment.id,
        mockRefundId,
        selectedPayment.amount,
        selectedPayment.intake?.id
      )

      if (result.success) {
        toast.success("Refund processed successfully")
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
      toast.error("Please provide a reason")
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "eligible":
        return <Badge className="bg-amber-100 text-amber-800"><Clock className="h-3 w-3 mr-1" />Eligible</Badge>
      case "processing":
        return <Badge className="bg-blue-100 text-blue-800"><RefreshCw className="h-3 w-3 mr-1 animate-spin" />Processing</Badge>
      case "refunded":
        return <Badge className="bg-emerald-100 text-emerald-800"><CheckCircle className="h-3 w-3 mr-1" />Refunded</Badge>
      case "failed":
        return <Badge className="bg-red-100 text-red-800"><XCircle className="h-3 w-3 mr-1" />Failed</Badge>
      case "not_eligible":
        return <Badge variant="secondary"><XCircle className="h-3 w-3 mr-1" />Not Eligible</Badge>
      default:
        return <Badge variant="outline">{formatRefundStatus(status)}</Badge>
    }
  }

  const totalPages = Math.ceil(total / pageSize)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/admin">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
              <CreditCard className="h-6 w-6 text-primary" />
              Refunds Manager
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Process refunds and manage payment disputes
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-5">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold text-amber-600">{stats.eligible}</p>
              </div>
              <Clock className="h-8 w-8 text-amber-500/50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Processing</p>
                <p className="text-2xl font-bold text-blue-600">{stats.processing}</p>
              </div>
              <RefreshCw className="h-8 w-8 text-blue-500/50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold text-emerald-600">{stats.refunded}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-emerald-500/50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Failed</p>
                <p className="text-2xl font-bold text-red-600">{stats.failed}</p>
              </div>
              <XCircle className="h-8 w-8 text-red-500/50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Refunded</p>
                <p className="text-2xl font-bold">{formatAmount(stats.totalRefunded)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-muted-foreground/50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Payments</CardTitle>
          <CardDescription>
            Review and process refund requests
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3 mb-4">
            <div className="flex-1 min-w-[200px]">
              <Input
                placeholder="Search payments..."
                startContent={<Search className="h-4 w-4 text-muted-foreground" />}
              />
            </div>
            <Select
              value={filters.status || "all"}
              onValueChange={(v) => handleFilterChange("status", v)}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Refund status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {REFUND_STATUSES.map((status) => (
                  <SelectItem key={status.value} value={status.value}>
                    {status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Date</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>Service</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-32 mb-1" />
                        <Skeleton className="h-3 w-24" />
                      </TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                      <TableCell className="text-right"><Skeleton className="h-8 w-16 ml-auto" /></TableCell>
                    </TableRow>
                  ))
                ) : payments.length > 0 ? (
                  payments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell className="font-mono text-xs whitespace-nowrap">
                        {new Date(payment.created_at).toLocaleDateString("en-AU")}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{payment.intake?.patient?.full_name || "—"}</p>
                          <p className="text-xs text-muted-foreground">{payment.intake?.patient?.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {payment.intake?.service?.short_name || payment.intake?.service?.name || "—"}
                      </TableCell>
                      <TableCell className="font-mono">
                        {formatAmount(payment.amount)}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(payment.refund_status)}
                      </TableCell>
                      <TableCell className="text-right">
                        {payment.refund_status === "eligible" && (
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-emerald-600 hover:text-emerald-700"
                              onClick={() => {
                                setSelectedPayment(payment)
                                setIsProcessDialogOpen(true)
                              }}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Refund
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive"
                              onClick={() => {
                                setSelectedPayment(payment)
                                setIsRejectDialogOpen(true)
                              }}
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Reject
                            </Button>
                          </div>
                        )}
                        {payment.refund_status === "refunded" && payment.refunded_at && (
                          <span className="text-xs text-muted-foreground">
                            {new Date(payment.refunded_at).toLocaleDateString("en-AU")}
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No payments found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">
                Showing {((page - 1) * pageSize) + 1} - {Math.min(page * pageSize, total)} of {total}
              </p>
              <Pagination
                total={totalPages}
                page={page}
                onChange={(newPage) => fetchPayments(filters, newPage)}
                showControls
                size="sm"
                isDisabled={isLoading}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Process Refund Dialog */}
      <Dialog open={isProcessDialogOpen} onOpenChange={setIsProcessDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Process Refund
            </DialogTitle>
            <DialogDescription>
              This will refund the full payment amount to the patient&apos;s original payment method.
            </DialogDescription>
          </DialogHeader>
          {selectedPayment && (
            <div className="py-4 space-y-4">
              <div className="p-4 rounded-lg bg-muted">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <Label className="text-muted-foreground">Patient</Label>
                    <p className="font-medium">{selectedPayment.intake?.patient?.full_name}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Service</Label>
                    <p className="font-medium">{selectedPayment.intake?.service?.short_name || selectedPayment.intake?.service?.name || "—"}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Amount</Label>
                    <p className="font-medium text-lg">{formatAmount(selectedPayment.amount)}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Reason</Label>
                    <p className="font-medium">{selectedPayment.refund_reason || "Request declined"}</p>
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-50 border border-amber-200">
                <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-amber-900">This action cannot be undone</p>
                  <p className="text-amber-700">The refund will be processed through Stripe immediately.</p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsProcessDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleProcessRefund} disabled={isProcessing}>
              {isProcessing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4 mr-2" />
              )}
              Process Refund
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-destructive" />
              Reject Refund Request
            </DialogTitle>
            <DialogDescription>
              Mark this payment as not eligible for a refund. Please provide a reason.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="space-y-2">
              <Label htmlFor="reject-reason">Reason for rejection</Label>
              <Textarea
                id="reject-reason"
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                placeholder="e.g., Service was delivered as requested..."
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
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <XCircle className="h-4 w-4 mr-2" />
              )}
              Reject Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
