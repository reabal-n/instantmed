"use client"

import { useState, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Search,
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  Pill,
  User,
  Calendar,
  TrendingUp,
  AlertCircle,
  Eye,
  MessageSquare,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectItem,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { toast } from "sonner"

type RequestStatus = "submitted" | "in_review" | "approved" | "rejected" | "requires_info"
type RequestType = "medical_certificate" | "prescription" | "consult"

interface Request {
  id: string
  type: RequestType
  status: RequestStatus
  created_at: string
  updated_at: string
  patient_id: string
  doctor_id: string | null
  answers: Record<string, unknown>
  doctor_notes: string | null
  patient: {
    id: string
    full_name: string
    email: string
    phone: string | null
  }
}

interface DoctorDashboardClientProps {
  doctorId: string
  doctorName: string
  initialRequests: Request[]
  stats: {
    total: number
    pending: number
    approvedToday: number
  }
}

const STATUS_CONFIG = {
  submitted: { label: "New", color: "bg-primary", icon: Clock },
  in_review: { label: "Reviewing", color: "bg-yellow-500", icon: Eye },
  approved: { label: "Approved", color: "bg-green-500", icon: CheckCircle },
  rejected: { label: "Rejected", color: "bg-red-500", icon: XCircle },
  requires_info: { label: "More Info", color: "bg-orange-500", icon: AlertCircle },
}

const TYPE_CONFIG = {
  medical_certificate: { label: "Med Cert", icon: FileText },
  prescription: { label: "Prescription", icon: Pill },
  consult: { label: "Consult", icon: MessageSquare },
}

export function DoctorDashboardClient({
  doctorId,
  doctorName,
  initialRequests,
  stats,
}: DoctorDashboardClientProps) {
  const [requests, setRequests] = useState<Request[]>(initialRequests)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [selectedRequests, setSelectedRequests] = useState<Set<string>>(new Set())
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null)
  const [showBulkAction, setShowBulkAction] = useState(false)
  const [bulkActionType, setBulkActionType] = useState<"approve" | "reject" | null>(null)
  const [bulkNotes, setBulkNotes] = useState("")

  // Filter and search requests
  const filteredRequests = useMemo(() => {
    return requests.filter((req) => {
      const matchesSearch =
        searchQuery === "" ||
        req.patient.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        req.patient.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        req.id.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesStatus = statusFilter === "all" || req.status === statusFilter
      const matchesType = typeFilter === "all" || req.type === typeFilter

      return matchesSearch && matchesStatus && matchesType
    })
  }, [requests, searchQuery, statusFilter, typeFilter])

  // Toggle selection
  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedRequests)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedRequests(newSelected)
  }

  // Select all visible
  const selectAll = () => {
    if (selectedRequests.size === filteredRequests.length) {
      setSelectedRequests(new Set())
    } else {
      setSelectedRequests(new Set(filteredRequests.map((r) => r.id)))
    }
  }

  // Handle bulk action
  const handleBulkAction = async (action: "approve" | "reject", notes: string) => {
    try {
      const response = await fetch("/api/doctor/bulk-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          request_ids: Array.from(selectedRequests),
          action,
          notes,
          doctor_id: doctorId,
        }),
      })

      if (!response.ok) throw new Error("Failed to process bulk action")

      const { updated } = await response.json()

      // Update local state
      setRequests((prev) =>
        prev.map((req) =>
          selectedRequests.has(req.id)
            ? { ...req, status: action === "approve" ? "approved" : "rejected", doctor_notes: notes }
            : req
        )
      )

      setSelectedRequests(new Set())
      setShowBulkAction(false)
      setBulkNotes("")
      toast.success(`${updated} requests ${action === "approve" ? "approved" : "rejected"}`)
    } catch (error) {
      // Client-side error logging - acceptable in development
      if (process.env.NODE_ENV === 'development') {
        // eslint-disable-next-line no-console
        console.error("Bulk action error:", error)
      }
      toast.error("Failed to process bulk action")
    }
  }

  // Handle single request action
  const handleSingleAction = async (requestId: string, action: "approve" | "reject", notes: string) => {
    try {
      const response = await fetch("/api/doctor/update-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          request_id: requestId,
          action,
          notes,
          doctor_id: doctorId,
        }),
      })

      if (!response.ok) throw new Error("Failed to update request")

      // Update local state
      setRequests((prev) =>
        prev.map((req) =>
          req.id === requestId
            ? { ...req, status: action === "approve" ? "approved" : "rejected", doctor_notes: notes }
            : req
        )
      )

      setSelectedRequest(null)
      toast.success(`Request ${action === "approve" ? "approved" : "rejected"}`)
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        // eslint-disable-next-line no-console
        console.error("Update error:", error)
      }
      toast.error("Failed to update request")
    }
  }

  // Assign request to self
  const assignToSelf = async (requestId: string) => {
    try {
      const response = await fetch("/api/doctor/assign-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          request_id: requestId,
          doctor_id: doctorId,
        }),
      })

      if (!response.ok) throw new Error("Failed to assign request")

      setRequests((prev) =>
        prev.map((req) => (req.id === requestId ? { ...req, doctor_id: doctorId, status: "in_review" } : req))
      )

      toast.success("Request assigned to you")
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        // eslint-disable-next-line no-console
        console.error("Assign error:", error)
      }
      toast.error("Failed to assign request")
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Doctor Dashboard</h1>
              <p className="text-sm text-muted-foreground">Welcome back, {doctorName}</p>
            </div>
            <Link href="/doctor/profile">
              <Button variant="outline">
                <User className="w-4 h-4 mr-2" />
                Profile
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <StatCard
            title="Total Requests"
            value={stats.total}
            icon={FileText}
            color="blue"
          />
          <StatCard
            title="Pending Review"
            value={stats.pending}
            icon={Clock}
            color="yellow"
          />
          <StatCard
            title="Approved Today"
            value={stats.approvedToday}
            icon={TrendingUp}
            color="green"
          />
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-xl border p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search by patient name, email, or request ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                startContent={<Search className="w-4 h-4 text-muted-foreground" />}
              />
            </div>
            <Select
              selectedKeys={statusFilter ? [statusFilter] : []}
              onSelectionChange={(keys) => {
                const selected = Array.from(keys)[0] as string
                setStatusFilter(selected || "all")
              }}
              placeholder="Filter by status"
              className="w-full md:w-48"
              classNames={{
                trigger: "w-full md:w-48",
              }}
            >
              <SelectItem key="all">All Statuses</SelectItem>
              <SelectItem key="submitted">New</SelectItem>
              <SelectItem key="in_review">Reviewing</SelectItem>
              <SelectItem key="approved">Approved</SelectItem>
              <SelectItem key="rejected">Rejected</SelectItem>
              <SelectItem key="requires_info">Requires Info</SelectItem>
            </Select>
            <Select
              selectedKeys={typeFilter ? [typeFilter] : []}
              onSelectionChange={(keys) => {
                const selected = Array.from(keys)[0] as string
                setTypeFilter(selected || "all")
              }}
              placeholder="Filter by type"
              className="w-full md:w-48"
              classNames={{
                trigger: "w-full md:w-48",
              }}
            >
              <SelectItem key="all">All Types</SelectItem>
              <SelectItem key="medical_certificate">Med Cert</SelectItem>
              <SelectItem key="prescription">Prescription</SelectItem>
              <SelectItem key="consult">Consult</SelectItem>
            </Select>
          </div>
        </div>

        {/* Bulk Actions Bar */}
        <AnimatePresence>
          {selectedRequests.size > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-primary text-primary-foreground rounded-xl p-4 mb-6 flex items-center justify-between"
            >
              <span className="font-medium">{selectedRequests.size} requests selected</span>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setBulkActionType("approve")
                    setShowBulkAction(true)
                  }}
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Bulk Approve
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    setBulkActionType("reject")
                    setShowBulkAction(true)
                  }}
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Bulk Reject
                </Button>
                <Button variant="ghost" onClick={() => setSelectedRequests(new Set())}>
                  Clear
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Requests Table */}
        <div className="bg-white rounded-xl border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedRequests.size === filteredRequests.length && filteredRequests.length > 0}
                      onChange={selectAll}
                      className="rounded"
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                    Patient
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                    Type
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                    Submitted
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredRequests.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                      No requests found
                    </td>
                  </tr>
                ) : (
                  filteredRequests.map((request) => (
                    <RequestRow
                      key={request.id}
                      request={request}
                      isSelected={selectedRequests.has(request.id)}
                      onToggleSelect={() => toggleSelection(request.id)}
                      onView={() => setSelectedRequest(request)}
                      onAssign={() => assignToSelf(request.id)}
                      isAssignedToMe={request.doctor_id === doctorId}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Results count */}
        <div className="mt-4 text-sm text-muted-foreground text-center">
          Showing {filteredRequests.length} of {requests.length} requests
        </div>
      </div>

      {/* Bulk Action Dialog */}
      <Dialog open={showBulkAction} onOpenChange={setShowBulkAction}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {bulkActionType === "approve" ? "Bulk Approve" : "Bulk Reject"} Requests
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              You are about to {bulkActionType === "approve" ? "approve" : "reject"}{" "}
              {selectedRequests.size} requests.
            </p>
            <div>
              <label className="text-sm font-medium mb-2 block">
                Notes {bulkActionType === "approve" ? "(optional)" : "(required)"}
              </label>
              <Textarea
                value={bulkNotes}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBulkNotes(e.target.value)}
                placeholder="Add notes for these requests..."
                minRows={4}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowBulkAction(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => bulkActionType && handleBulkAction(bulkActionType, bulkNotes)}
                disabled={bulkActionType === "reject" && !bulkNotes}
                variant={bulkActionType === "approve" ? "default" : "destructive"}
              >
                {bulkActionType === "approve" ? "Approve" : "Reject"} {selectedRequests.size} Requests
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Request Detail Dialog */}
      {selectedRequest && (
        <RequestDetailDialog
          request={selectedRequest}
          onClose={() => setSelectedRequest(null)}
          onAction={handleSingleAction}
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
  color: "blue" | "yellow" | "green"
}) {
  const colorClasses = {
    blue: "bg-primary/10 text-primary",
    yellow: "bg-yellow-500/10 text-yellow-600",
    green: "bg-green-500/10 text-green-600",
  }

  return (
    <div className="bg-white rounded-xl border p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground mb-1">{title}</p>
          <p className="text-3xl font-bold">{value}</p>
        </div>
        <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center", colorClasses[color])}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  )
}

function RequestRow({
  request,
  isSelected,
  onToggleSelect,
  onView,
  onAssign,
  isAssignedToMe,
}: {
  request: Request
  isSelected: boolean
  onToggleSelect: () => void
  onView: () => void
  onAssign: () => void
  isAssignedToMe: boolean
}) {
  const StatusIcon = STATUS_CONFIG[request.status].icon
  const TypeIcon = TYPE_CONFIG[request.type].icon

  return (
    <tr className={cn("hover:bg-slate-50 transition-colors", isSelected && "bg-blue-50")}>
      <td className="px-4 py-3">
        <input type="checkbox" checked={isSelected} onChange={onToggleSelect} className="rounded" />
      </td>
      <td className="px-4 py-3">
        <div>
          <p className="font-medium text-sm">{request.patient.full_name}</p>
          <p className="text-xs text-muted-foreground">{request.patient.email}</p>
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <TypeIcon className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm">{TYPE_CONFIG[request.type].label}</span>
        </div>
      </td>
      <td className="px-4 py-3">
        <Badge variant="secondary" className="flex items-center gap-1 w-fit">
          <StatusIcon className="w-3 h-3" />
          {STATUS_CONFIG[request.status].label}
        </Badge>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="w-4 h-4" />
          {new Date(request.created_at).toLocaleDateString()}
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={onView}>
            <Eye className="w-4 h-4 mr-1" />
            View
          </Button>
          {!isAssignedToMe && !request.doctor_id && (
            <Button size="sm" variant="default" onClick={onAssign}>
              Assign to Me
            </Button>
          )}
        </div>
      </td>
    </tr>
  )
}

function RequestDetailDialog({
  request,
  onClose,
  onAction,
}: {
  request: Request
  onClose: () => void
  onAction: (requestId: string, action: "approve" | "reject", notes: string) => Promise<void>
}) {
  const [notes, setNotes] = useState(request.doctor_notes || "")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleAction = async (action: "approve" | "reject") => {
    setIsSubmitting(true)
    await onAction(request.id, action, notes)
    setIsSubmitting(false)
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Request Details</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Patient Info */}
          <div>
            <h3 className="font-semibold mb-2">Patient Information</h3>
            <div className="bg-slate-50 rounded-lg p-4 space-y-1">
              <p><strong>Name:</strong> {request.patient.full_name}</p>
              <p><strong>Email:</strong> {request.patient.email}</p>
              {request.patient.phone && <p><strong>Phone:</strong> {request.patient.phone}</p>}
            </div>
          </div>

          {/* Request Details */}
          <div>
            <h3 className="font-semibold mb-2">Request Details</h3>
            <div className="bg-slate-50 rounded-lg p-4">
              <pre className="text-sm whitespace-pre-wrap">
                {JSON.stringify(request.answers, null, 2)}
              </pre>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="font-semibold mb-2 block">Doctor Notes</label>
            <Textarea
              value={notes}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNotes(e.target.value)}
              placeholder="Add your notes here..."
              minRows={4}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => handleAction("reject")}
              disabled={isSubmitting || !notes}
            >
              <XCircle className="w-4 h-4 mr-2" />
              Reject
            </Button>
            <Button onClick={() => handleAction("approve")} disabled={isSubmitting}>
              <CheckCircle className="w-4 h-4 mr-2" />
              Approve
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
