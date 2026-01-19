"use client"

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  CreditCard,
  Download,
  CheckCircle,
  AlertCircle,
  Clock,
  Search,
  RotateCcw,
  Eye,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

interface Invoice {
  id: string
  number: string
  created_at: string
  total: number
  status: "paid" | "pending" | "failed"
  description?: string
  payment_method?: string
}

interface PaymentHistoryContentProps {
  patientId: string
}

const STATUS_COLORS = {
  paid: "bg-green-100 text-green-800",
  pending: "bg-yellow-100 text-yellow-800",
  failed: "bg-red-100 text-red-800",
}

export function PaymentHistoryContent(_props: PaymentHistoryContentProps) {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRetrying, setIsRetrying] = useState(false)
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [filterStatus, setFilterStatus] = useState<"all" | "paid" | "pending" | "failed">("all")

  // Fetch invoices
  useEffect(() => {
    const fetchInvoices = async () => {
      try {
        setIsLoading(true)
        const response = await fetch("/api/patient/get-invoices")
        if (!response.ok) throw new Error("Failed to fetch invoices")
        const data = await response.json()
        setInvoices(data.invoices || [])
      } catch (_error) {
        toast.error("Failed to load payment history")
      } finally {
        setIsLoading(false)
      }
    }

    fetchInvoices()
  }, [])

  // Filter invoices
  const filteredInvoices = invoices.filter((invoice) => {
    const matchesSearch =
      invoice.number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      invoice.id.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus =
      filterStatus === "all" || invoice.status === filterStatus

    return matchesSearch && matchesStatus
  })

  const handleDownloadInvoice = async (invoiceId: string) => {
    try {
      const response = await fetch(
        `/api/patient/download-invoice?invoiceId=${invoiceId}`
      )
      if (!response.ok) throw new Error("Download failed")

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `invoice-${invoiceId}.pdf`
      a.click()
      window.URL.revokeObjectURL(url)
      toast.success("Invoice downloaded successfully")
    } catch (_error) {
      toast.error("Failed to download invoice")
    }
  }

  const handleRetryPayment = async (invoiceId: string) => {
    try {
      setIsRetrying(true)
      const response = await fetch("/api/patient/retry-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoiceId }),
      })

      if (!response.ok) throw new Error("Retry failed")

      const data = await response.json()
      toast.success(data.message || "Payment retry initiated")

      // Redirect to payment page
      if (data.paymentUrl) {
        window.location.href = data.paymentUrl
      }
    } catch (_error) {
      toast.error("Failed to retry payment")
    } finally {
      setIsRetrying(false)
    }
  }

  // Stats
  const totalPaid = invoices
    .filter((inv) => inv.status === "paid")
    .reduce((sum, inv) => sum + inv.total, 0)
  const pendingAmount = invoices
    .filter((inv) => inv.status === "pending")
    .reduce((sum, inv) => sum + inv.total, 0)
  const failedCount = invoices.filter((inv) => inv.status === "failed").length

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-4"
      >
        <StatCard
          title="Total Paid"
          value={`$${(totalPaid / 100).toFixed(2)}`}
          icon={CheckCircle}
          color="green"
        />
        <StatCard
          title="Pending Payment"
          value={`$${(pendingAmount / 100).toFixed(2)}`}
          icon={Clock}
          color="yellow"
        />
        <StatCard
          title="Failed Payments"
          value={failedCount.toString()}
          icon={AlertCircle}
          color="red"
        />
      </motion.div>

      {/* Controls */}
      <div className="bg-white rounded-lg border p-4 space-y-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <Input
              placeholder="Search by invoice number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              startContent={<Search className="w-4 h-4 text-muted-foreground" />}
            />
          </div>

          {/* Filter */}
          <select
            value={filterStatus}
            onChange={(e) =>
              setFilterStatus(e.target.value as typeof filterStatus)
            }
            className="px-4 py-2 border rounded-lg bg-white hover:bg-slate-50 transition-colors"
          >
            <option value="all">All Statuses</option>
            <option value="paid">Paid</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
          </select>
        </div>
      </div>

      {/* Invoices Table */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="bg-white rounded-lg border overflow-hidden"
      >
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <CreditCard className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-muted-foreground">Loading payment history...</p>
            </div>
          </div>
        ) : filteredInvoices.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <CreditCard className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-muted-foreground">
                {searchQuery || filterStatus !== "all"
                  ? "No invoices match your filters"
                  : "No invoices yet"}
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="text-left px-6 py-3 text-sm font-semibold">
                    Invoice #
                  </th>
                  <th className="text-left px-6 py-3 text-sm font-semibold">
                    Date
                  </th>
                  <th className="text-left px-6 py-3 text-sm font-semibold">
                    Amount
                  </th>
                  <th className="text-left px-6 py-3 text-sm font-semibold">
                    Status
                  </th>
                  <th className="text-left px-6 py-3 text-sm font-semibold">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence>
                  {filteredInvoices.map((invoice) => (
                    <motion.tr
                      key={invoice.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="border-b hover:bg-slate-50 transition-colors"
                    >
                      <td className="px-6 py-4 text-sm font-semibold">
                        {invoice.number}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {new Date(invoice.created_at).toLocaleDateString(
                          "en-AU",
                          {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          }
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold">
                        ${(invoice.total / 100).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <Badge
                          className={cn(
                            STATUS_COLORS[
                              invoice.status as keyof typeof STATUS_COLORS
                            ]
                          )}
                        >
                          {invoice.status === "paid" && (
                            <CheckCircle className="w-3 h-3 mr-1" />
                          )}
                          {invoice.status === "pending" && (
                            <Clock className="w-3 h-3 mr-1" />
                          )}
                          {invoice.status === "failed" && (
                            <AlertCircle className="w-3 h-3 mr-1" />
                          )}
                          {invoice.status.charAt(0).toUpperCase() +
                            invoice.status.slice(1)}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-sm space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedInvoice(invoice)}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          View
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDownloadInvoice(invoice.id)}
                        >
                          <Download className="w-4 h-4 mr-1" />
                          Download
                        </Button>
                        {invoice.status === "failed" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRetryPayment(invoice.id)}
                            disabled={isRetrying}
                          >
                            <RotateCcw className="w-4 h-4 mr-1" />
                            Retry
                          </Button>
                        )}
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        )}
      </motion.div>

      {/* Invoice Detail Modal */}
      <AnimatePresence>
        {selectedInvoice && (
          <InvoiceDetailModal
            invoice={selectedInvoice}
            onClose={() => setSelectedInvoice(null)}
            onDownload={() => handleDownloadInvoice(selectedInvoice.id)}
            onRetry={() => handleRetryPayment(selectedInvoice.id)}
            isRetrying={isRetrying}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

function StatCard({
  title,
  value,
  icon: Icon,
  color,
}: {
  title: string
  value: string
  icon: React.ElementType
  color: "green" | "yellow" | "red"
}) {
  const colors = {
    green: "bg-green-100 text-green-600",
    yellow: "bg-yellow-100 text-yellow-600",
    red: "bg-red-100 text-red-600",
  }

  return (
    <div className="bg-white rounded-lg border p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
        </div>
        <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", colors[color])}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  )
}

interface InvoiceDetailModalProps {
  invoice: Invoice
  onClose: () => void
  onDownload: () => void
  onRetry: () => void
  isRetrying: boolean
}

function InvoiceDetailModal({
  invoice,
  onClose,
  onDownload,
  onRetry,
  isRetrying,
}: InvoiceDetailModalProps) {
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Invoice {invoice.number}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Invoice Date</p>
              <p className="font-semibold">
                {new Date(invoice.created_at).toLocaleDateString("en-AU", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Amount</p>
              <p className="font-semibold text-lg">
                ${(invoice.total / 100).toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <Badge
                className={cn(
                  "mt-2",
                  STATUS_COLORS[invoice.status as keyof typeof STATUS_COLORS]
                )}
              >
                {invoice.status.charAt(0).toUpperCase() +
                  invoice.status.slice(1)}
              </Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Invoice Number</p>
              <p className="font-semibold">{invoice.id}</p>
            </div>
          </div>

          {invoice.description && (
            <div>
              <p className="text-sm text-muted-foreground mb-2">Description</p>
              <p>{invoice.description}</p>
            </div>
          )}

          {invoice.status === "failed" && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-700">
                This payment failed. Please try again or update your payment
                method.
              </p>
            </div>
          )}

          <div className="flex gap-2">
            <Button onClick={onDownload} className="flex-1">
              <Download className="w-4 h-4 mr-2" />
              Download Invoice
            </Button>
            {invoice.status === "failed" && (
              <Button
                onClick={onRetry}
                disabled={isRetrying}
                variant="outline"
                className="flex-1"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                {isRetrying ? "Retrying..." : "Retry Payment"}
              </Button>
            )}
            <Button onClick={onClose} variant="outline">
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
