"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import Link from "next/link"
import {
  FileText,
  Pill,
  DownloadCloud,
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  CreditCard,
  Settings,
  Plus,
  Search,
  ChevronRight,
  Printer,
} from "lucide-react"
import { Button, Input, Badge } from "@/components/uix"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { EmptyState as EnhancedEmptyState } from "@/components/ui/empty-state"
import { cn } from "@/lib/utils"

interface Request {
  id: string
  type: string
  status: string
  created_at: string
  updated_at: string
  answers?: Record<string, unknown>
  doctor_notes?: string
}

interface Prescription {
  id: string
  medication_name: string
  dosage: string
  issued_date: string
  renewal_date: string
  status: "active" | "expired"
}

interface Invoice {
  id: string
  number: string
  created_at: string
  total: number
  status: "paid" | "pending"
}

interface PaymentMethod {
  id: string
  brand: string
  last4: string
  exp_month: number
  exp_year: number
}

interface PatientDashboardProps {
  fullName: string
  email: string
  requests?: Request[]
  prescriptions?: Prescription[]
  invoices?: Invoice[]
  paymentMethods?: PaymentMethod[]
}

const STATUS_COLORS = {
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  pending: "bg-yellow-100 text-yellow-800",
  in_review: "bg-blue-100 text-blue-800",
  requires_info: "bg-orange-100 text-orange-800",
}

export function PatientDashboard({
  fullName,
  email,
  requests = [],
  prescriptions = [],
  invoices = [],
  paymentMethods = [],
}: PatientDashboardProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "requests" | "prescriptions" | "invoices" | "payment">(
    "overview"
  )
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null)
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)

  const firstName = fullName.split(" ")[0]
  const approvedRequests = requests.filter((r) => r.status === "approved").length
  const pendingRequests = requests.filter((r) => r.status === "pending" || r.status === "in_review").length
  const activeRxCount = prescriptions.filter((p) => p.status === "active").length
  const nextRenewalDate = prescriptions
    .filter((p) => p.status === "active")
    .sort((a, b) => new Date(a.renewal_date).getTime() - new Date(b.renewal_date).getTime())[0]?.renewal_date

  const tabs = [
    { id: "overview" as const, label: "Overview", icon: FileText },
    { id: "requests" as const, label: "Requests", icon: FileText },
    { id: "prescriptions" as const, label: "Prescriptions", icon: Pill },
    { id: "invoices" as const, label: "Invoices", icon: CreditCard },
    { id: "payment" as const, label: "Payment Methods", icon: CreditCard },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Welcome back, {firstName}</h1>
              <p className="text-sm text-muted-foreground">{email}</p>
            </div>
            <Link href="/patient/settings">
              <Button variant="outline">
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Quick Stats */}
        {activeTab === "overview" && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <StatCard
              title="Total Requests"
              value={requests.length}
              icon={FileText}
              color="blue"
            />
            <StatCard
              title="Pending"
              value={pendingRequests}
              icon={Clock}
              color="yellow"
            />
            <StatCard
              title="Approved"
              value={approvedRequests}
              icon={CheckCircle}
              color="green"
            />
            <StatCard
              title="Active Prescriptions"
              value={activeRxCount}
              icon={Pill}
              color="purple"
            />
          </motion.div>
        )}

        {/* Tabs */}
        <div className="bg-white rounded-xl border mb-6">
          <div className="flex gap-0 border-b">
            {tabs.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "px-6 py-4 text-sm font-medium border-b-2 transition-colors flex items-center gap-2",
                    activeTab === tab.id
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              )
            })}
          </div>

          <div className="p-6">
            <AnimatePresence mode="wait">
              {/* Overview Tab */}
              {activeTab === "overview" && (
                <motion.div key="overview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
                  {/* Quick Actions */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-primary">
                      <h3 className="font-semibold mb-2">New Request</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Need a medical certificate or prescription?
                      </p>
                      <Link href="/start">
                        <Button className="w-full">
                          <Plus className="w-4 h-4 mr-2" />
                          Start New Request
                        </Button>
                      </Link>
                    </div>

                    {nextRenewalDate && (
                      <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border border-green-200">
                        <h3 className="font-semibold mb-2">Next Prescription Renewal</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                          {new Date(nextRenewalDate).toLocaleDateString("en-AU", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </p>
                        <Link href="/prescriptions/repeat">
                          <Button variant="outline" className="w-full">
                            <Pill className="w-4 h-4 mr-2" />
                            Request Renewal
                          </Button>
                        </Link>
                      </div>
                    )}
                  </div>

                  {/* Recent Requests */}
                  <div>
                    <h3 className="font-semibold mb-4">Recent Requests</h3>
                    {requests.length === 0 ? (
                      <EmptyState title="No requests yet" icon={FileText} />
                    ) : (
                      <div className="space-y-2">
                        {requests.slice(0, 3).map((request) => (
                          <RequestCard
                            key={request.id}
                            request={request}
                            onClick={() => setSelectedRequest(request)}
                          />
                        ))}
                        {requests.length > 3 && (
                          <Link href="#requests" onClick={() => setActiveTab("requests")}>
                            <Button variant="ghost" className="w-full justify-center">
                              View all {requests.length} requests
                              <ChevronRight className="w-4 h-4 ml-2" />
                            </Button>
                          </Link>
                        )}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {/* Requests Tab */}
              {activeTab === "requests" && (
                <motion.div key="requests" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                  <div className="flex gap-4">
                    <div className="flex-1 relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Search requests..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>

                  {requests.length === 0 ? (
                    <EmptyState title="No requests yet" description="Start your first request" icon={FileText} />
                  ) : (
                    <div className="space-y-3">
                      {requests.map((request) => (
                        <RequestCard
                          key={request.id}
                          request={request}
                          onClick={() => setSelectedRequest(request)}
                          showFullDetails
                        />
                      ))}
                    </div>
                  )}
                </motion.div>
              )}

              {/* Prescriptions Tab */}
              {activeTab === "prescriptions" && (
                <motion.div key="prescriptions" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                  {prescriptions.length === 0 ? (
                    <EmptyState title="No prescriptions" description="Start a prescription request" icon={Pill} />
                  ) : (
                    <div className="space-y-3">
                      {prescriptions.map((rx) => (
                        <div
                          key={rx.id}
                          className="bg-slate-50 rounded-lg p-4 border border-slate-200 hover:border-slate-300 transition-colors"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="font-semibold">{rx.medication_name}</h4>
                              <p className="text-sm text-muted-foreground">{rx.dosage}</p>
                              <div className="flex gap-3 mt-2 text-sm">
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-4 h-4" />
                                  {new Date(rx.issued_date).toLocaleDateString()}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Clock className="w-4 h-4" />
                                  Renews{" "}
                                  {new Date(rx.renewal_date).toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                            <div className="text-right">
                              <Badge color={rx.status === "active" ? "success" : "default"}>
                                {rx.status === "active" ? "Active" : "Expired"}
                              </Badge>
                              {rx.status === "active" && (
                                <Button variant="outline" size="sm" className="mt-2 w-full">
                                  <Pill className="w-4 h-4 mr-1" />
                                  Renew
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}

              {/* Invoices Tab */}
              {activeTab === "invoices" && (
                <motion.div key="invoices" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                  {invoices.length === 0 ? (
                    <EmptyState title="No invoices" icon={CreditCard} />
                  ) : (
                    <div className="space-y-3">
                      {invoices.map((invoice) => (
                        <div
                          key={invoice.id}
                          className="bg-slate-50 rounded-lg p-4 border border-slate-200 hover:border-slate-300 transition-colors flex items-center justify-between"
                        >
                          <div className="flex-1">
                            <h4 className="font-semibold">Invoice {invoice.number}</h4>
                            <p className="text-sm text-muted-foreground">
                              {new Date(invoice.created_at).toLocaleDateString("en-AU", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold">${(invoice.total / 100).toFixed(2)}</p>
                            <Badge className="mt-2" color={invoice.status === "paid" ? "success" : "warning"}>
                              {invoice.status === "paid" ? "Paid" : "Pending"}
                            </Badge>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedInvoice(invoice)}
                            className="ml-4"
                          >
                            <DownloadCloud className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}

              {/* Payment Methods Tab */}
              {activeTab === "payment" && (
                <motion.div key="payment" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                  <Button className="w-full">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Payment Method
                  </Button>

                  {paymentMethods.length === 0 ? (
                    <EmptyState title="No payment methods" description="Add a card to speed up checkout" icon={CreditCard} />
                  ) : (
                    <div className="space-y-3">
                      {paymentMethods.map((method) => (
                        <div
                          key={method.id}
                          className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg p-4 border border-slate-200 flex items-center justify-between"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-8 bg-white rounded border border-slate-300 flex items-center justify-center text-xs font-semibold">
                              {method.brand.toUpperCase()}
                            </div>
                            <div>
                              <p className="font-semibold">•••• {method.last4}</p>
                              <p className="text-sm text-muted-foreground">
                                Expires {method.exp_month}/{method.exp_year}
                              </p>
                            </div>
                          </div>
                          <Button variant="ghost" size="sm">
                            Remove
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Request Detail Modal */}
      {selectedRequest && (
        <RequestDetailModal
          request={selectedRequest}
          onClose={() => setSelectedRequest(null)}
        />
      )}

      {/* Invoice Detail Modal */}
      {selectedInvoice && (
        <InvoiceDetailModal
          invoice={selectedInvoice}
          onClose={() => setSelectedInvoice(null)}
        />
      )}
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
  value: number
  icon: React.ElementType
  color: "blue" | "yellow" | "green" | "purple"
}) {
  const colors = {
    blue: "bg-blue-100 text-primary",
    yellow: "bg-yellow-100 text-yellow-600",
    green: "bg-green-100 text-green-600",
    purple: "bg-purple-100 text-purple-600",
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

function RequestCard({
  request,
  onClick,
  showFullDetails = false,
}: {
  request: Request
  onClick: () => void
  showFullDetails?: boolean
}) {
  const statusColor = STATUS_COLORS[request.status as keyof typeof STATUS_COLORS] || STATUS_COLORS.pending

  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-white rounded-lg border p-4 hover:border-primary hover:shadow-md transition-all"
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
              {request.type === "medical_certificate" ? (
                <FileText className="w-5 h-5 text-slate-600" />
              ) : (
                <Pill className="w-5 h-5 text-slate-600" />
              )}
            </div>
            <div>
              <h4 className="font-semibold">
                {request.type === "medical_certificate" ? "Medical Certificate" : "Prescription"}
              </h4>
              {showFullDetails && (
                <p className="text-sm text-muted-foreground">
                  {new Date(request.created_at).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>
        </div>
        <div className="text-right">
          <Badge className={statusColor}>
            {request.status === "approved" && <CheckCircle className="w-3 h-3 mr-1" />}
            {request.status === "rejected" && <AlertCircle className="w-3 h-3 mr-1" />}
            {request.status === "pending" && <Clock className="w-3 h-3 mr-1" />}
            {request.status.replace(/_/g, " ").charAt(0).toUpperCase() + request.status.slice(1).replace(/_/g, " ")}
          </Badge>
        </div>
      </div>
    </button>
  )
}

function EmptyState({
  title,
  description,
  icon: Icon,
}: {
  title: string
  description?: string
  icon: React.ElementType
}) {
  return (
    <EnhancedEmptyState
      icon={Icon}
      title={title}
      description={description || ""}
      tips={[
        "Most requests are reviewed within 15 minutes",
        "You can save drafts and complete later",
        "All your documents are stored securely"
      ]}
    />
  )
}

function RequestDetailModal({ request, onClose }: { request: Request; onClose: () => void }) {
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {request.type === "medical_certificate" ? "Medical Certificate" : "Prescription"} Request
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Status */}
          <div>
            <h3 className="font-semibold mb-2">Status</h3>
            <Badge className={STATUS_COLORS[request.status as keyof typeof STATUS_COLORS] || STATUS_COLORS.pending}>
              {request.status.replace(/_/g, " ")}
            </Badge>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Submitted</p>
              <p className="font-semibold">
                {new Date(request.created_at).toLocaleDateString("en-AU", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Last Updated</p>
              <p className="font-semibold">
                {new Date(request.updated_at).toLocaleDateString("en-AU", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
            </div>
          </div>

          {/* Request Details */}
          <div>
            <h3 className="font-semibold mb-2">Details</h3>
            <pre className="bg-slate-50 p-4 rounded-lg text-sm overflow-auto">
              {JSON.stringify(request.answers, null, 2)}
            </pre>
          </div>

          {/* Doctor Notes */}
          {request.doctor_notes && (
            <div>
              <h3 className="font-semibold mb-2">Doctor Notes</h3>
              <div className="bg-blue-50 border border-primary rounded-lg p-4 text-sm">
                {request.doctor_notes}
              </div>
            </div>
          )}

          {/* Download Button */}
          {request.status === "approved" && (
            <Button className="w-full">
              <DownloadCloud className="w-4 h-4 mr-2" />
              Download {request.type === "medical_certificate" ? "Certificate" : "Prescription"}
            </Button>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Close
            </Button>
            <Button variant="outline" className="flex-1">
              <Printer className="w-4 h-4 mr-2" />
              Print
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function InvoiceDetailModal({ invoice, onClose }: { invoice: Invoice; onClose: () => void }) {
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Invoice {invoice.number}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Date</p>
              <p className="font-semibold">
                {new Date(invoice.created_at).toLocaleDateString("en-AU")}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Amount</p>
              <p className="font-semibold text-lg">${(invoice.total / 100).toFixed(2)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <Badge>{invoice.status}</Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Reference</p>
              <p className="font-semibold">{invoice.id}</p>
            </div>
          </div>

          <Button className="w-full">
            <DownloadCloud className="w-4 h-4 mr-2" />
            Download Invoice PDF
          </Button>

          <Button variant="outline" onClick={onClose} className="w-full">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
