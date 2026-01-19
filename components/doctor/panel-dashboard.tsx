"use client"

import { useState, useMemo } from "react"
import {
  Search,
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  Pill,
  Calendar,
  TrendingUp,
  AlertCircle,
  MessageSquare,
  ChevronRight,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectItem } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { usePanel, DrawerPanel } from "@/components/panels"
import { FloatingActionBar, FloatingActionBarContent } from "@/components/shell"
import { BUTTON_COPY, FEEDBACK_MESSAGES } from "@/lib/microcopy"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { TiltCard } from "@/components/shared/tilt-card"

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

interface PanelDoctorDashboardProps {
  doctorId: string
  initialRequests: Request[]
  stats: {
    total: number
    pending: number
    approvedToday: number
  }
}

const STATUS_CONFIG = {
  submitted: { label: "New", color: "bg-blue-100 text-primary", icon: Clock },
  in_review: { label: "Reviewing", color: "bg-yellow-100 text-yellow-700", icon: AlertCircle },
  approved: { label: "Approved", color: "bg-green-100 text-green-700", icon: CheckCircle },
  rejected: { label: "Declined", color: "bg-red-100 text-red-700", icon: XCircle },
  requires_info: { label: "More info needed", color: "bg-orange-100 text-orange-700", icon: AlertCircle },
}

const TYPE_CONFIG = {
  medical_certificate: { label: "Medical Certificate", icon: FileText },
  prescription: { label: "Prescription", icon: Pill },
  consult: { label: "Consultation", icon: MessageSquare },
}

export function PanelDoctorDashboard({
  doctorId,
  initialRequests,
  stats,
}: PanelDoctorDashboardProps) {
  const [requests, setRequests] = useState<Request[]>(initialRequests)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [selectedRequests, setSelectedRequests] = useState<Set<string>>(new Set())
  const { openPanel } = usePanel()

  // Filter requests
  const filteredRequests = useMemo(() => {
    return requests.filter((req) => {
      const matchesSearch =
        searchQuery === "" ||
        req.patient.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        req.patient.email.toLowerCase().includes(searchQuery.toLowerCase())

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

  // Handle view request
  const handleViewRequest = (request: Request) => {
    openPanel({
      id: `request-${request.id}`,
      type: 'drawer',
      component: (
        <DrawerPanel title="Request Details" width={500}>
          <RequestDetailDrawer
            request={request}
            doctorId={doctorId}
            onUpdate={(updatedRequest) => {
              setRequests(prev => prev.map(r => r.id === updatedRequest.id ? updatedRequest : r))
            }}
          />
        </DrawerPanel>
      )
    })
  }

  // Bulk approve - WITH OPTIMISTIC UPDATE
  const handleBulkApprove = async () => {
    const selectedIds = Array.from(selectedRequests)
    const previousRequests = [...requests]
    
    // OPTIMISTIC UPDATE - Update UI immediately
    setRequests(prev =>
      prev.map(req =>
        selectedRequests.has(req.id) ? { ...req, status: "approved" as RequestStatus } : req
      )
    )
    setSelectedRequests(new Set())
    toast.success(`${selectedIds.length} requests approved`, {
      description: "Saving changes..."
    })

    try {
      const response = await fetch("/api/doctor/bulk-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          request_ids: selectedIds,
          action: "approve",
          notes: "",
          doctor_id: doctorId,
        }),
      })

      if (!response.ok) throw new Error("Failed")

      // Success - already updated optimistically
      toast.success(`${selectedIds.length} requests approved`, {
        description: "Changes saved ✓"
      })
    } catch (_error) {
      // ROLLBACK on error
      setRequests(previousRequests)
      setSelectedRequests(new Set(selectedIds))
      toast.error("That didn't save properly. Give it another go.", {
        description: "Your changes weren't saved"
      })
    }
  }

  // Bulk reject - WITH OPTIMISTIC UPDATE
  const handleBulkReject = async () => {
    const selectedIds = Array.from(selectedRequests)
    const previousRequests = [...requests]
    
    // OPTIMISTIC UPDATE - Update UI immediately
    setRequests(prev =>
      prev.map(req =>
        selectedRequests.has(req.id) ? { ...req, status: "rejected" as RequestStatus } : req
      )
    )
    setSelectedRequests(new Set())
    toast.success(`${selectedIds.length} requests declined`, {
      description: "Saving changes..."
    })

    try {
      const response = await fetch("/api/doctor/bulk-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          request_ids: selectedIds,
          action: "reject",
          notes: "Declined",
          doctor_id: doctorId,
        }),
      })

      if (!response.ok) throw new Error("Failed")

      // Success - already updated optimistically
      toast.success(`${selectedIds.length} requests declined`, {
        description: "Changes saved ✓"
      })
    } catch (_error) {
      // ROLLBACK on error
      setRequests(previousRequests)
      setSelectedRequests(new Set(selectedIds))
      toast.error("That didn't save properly. Give it another go.", {
        description: "Your changes weren't saved"
      })
    }
  }

  return (
    <div className="space-y-6">
      {/* Stats - Enhanced with TiltCard */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <TiltCard tiltAmount={5}>
          <StatCard label="Total Requests" value={stats.total} icon={FileText} color="blue" />
        </TiltCard>
        <TiltCard tiltAmount={5}>
          <StatCard label="Pending Review" value={stats.pending} icon={Clock} color="yellow" />
        </TiltCard>
        <TiltCard tiltAmount={5}>
          <StatCard label="Approved Today" value={stats.approvedToday} icon={TrendingUp} color="green" />
        </TiltCard>
      </div>

      {/* Filters */}
      <div className="card-premium-bg rounded-xl border border-gray-200 p-4 shadow-premium">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <Input
              placeholder="Search by patient name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              startContent={<Search className="w-4 h-4 text-gray-400" />}
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
            <SelectItem key="rejected">Declined</SelectItem>
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

      {/* Request Cards */}
      {filteredRequests.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-900 font-medium">{FEEDBACK_MESSAGES.noRequests}</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {filteredRequests.map((request) => (
            <RequestCard
              key={request.id}
              request={request}
              isSelected={selectedRequests.has(request.id)}
              onToggleSelect={() => toggleSelection(request.id)}
              onClick={() => handleViewRequest(request)}
            />
          ))}
        </div>
      )}

      {/* Results count */}
      <p className="text-sm text-gray-500 text-center">
        Showing {filteredRequests.length} of {requests.length} requests
      </p>

      {/* Floating Action Bar */}
      <FloatingActionBar isVisible={selectedRequests.size > 0}>
        <FloatingActionBarContent
          label={`${selectedRequests.size} selected`}
          actions={
            <>
              <Button onClick={handleBulkApprove} className="btn-premium glow-pulse">
                <CheckCircle className="w-4 h-4 mr-2" />
                {BUTTON_COPY.approve}
              </Button>
              <Button variant="destructive" onClick={handleBulkReject} className="scale-spring">
                <XCircle className="w-4 h-4 mr-2" />
                {BUTTON_COPY.reject}
              </Button>
            </>
          }
          onCancel={() => setSelectedRequests(new Set())}
        />
      </FloatingActionBar>
    </div>
  )
}

function StatCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string
  value: number
  icon: React.ElementType
  color: "blue" | "yellow" | "green"
}) {
  const colors = {
    blue: "bg-blue-50 text-primary",
    yellow: "bg-yellow-50 text-yellow-600",
    green: "bg-green-50 text-green-600",
  }

  return (
    <div className="card-premium-bg rounded-xl border border-gray-200 p-6 hover-lift card-shine shadow-premium">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600 mb-1">{label}</p>
          <p className="text-3xl font-semibold text-gray-900">{value}</p>
        </div>
        <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center icon-spin-hover", colors[color])}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  )
}

function RequestCard({
  request,
  isSelected,
  onToggleSelect,
  onClick,
}: {
  request: Request
  isSelected: boolean
  onToggleSelect: () => void
  onClick: () => void
}) {
  const StatusIcon = STATUS_CONFIG[request.status].icon
  const TypeIcon = TYPE_CONFIG[request.type].icon

  return (
    <div
      className={cn(
        "bg-white rounded-xl border border-gray-200 p-5 transition-all group",
        "hover:border-primary hover:shadow-md cursor-pointer hover-lift card-shine",
        isSelected && "border-primary bg-blue-50"
      )}
    >
      <div className="flex items-center gap-4">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={(e) => {
            e.stopPropagation()
            onToggleSelect()
          }}
          onClick={(e) => e.stopPropagation()}
          className="w-5 h-5 rounded"
        />
        
        <div className="flex-1" onClick={onClick}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3 flex-1">
              <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
                <TypeIcon className="w-5 h-5 text-gray-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900">{request.patient.full_name}</h3>
                <p className="text-sm text-gray-600">{TYPE_CONFIG[request.type].label}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <div className="text-right">
                <div className={cn("interactive-pill px-3 py-1.5 rounded-full flex items-center gap-1.5 text-sm font-medium whitespace-nowrap", STATUS_CONFIG[request.status].color)}>
                  <StatusIcon className="w-4 h-4" />
                  {STATUS_CONFIG[request.status].label}
                </div>
                <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-1 justify-end">
                  <Calendar className="w-3 h-3" />
                  {new Date(request.created_at).toLocaleDateString()}
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-primary transition-colors" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function RequestDetailDrawer({
  request,
  doctorId,
  onUpdate,
}: {
  request: Request
  doctorId: string
  onUpdate: (request: Request) => void
}) {
  const [notes, setNotes] = useState(request.doctor_notes || "")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { closePanel } = usePanel()

  const handleAction = async (action: "approve" | "reject") => {
    const previousStatus = request.status
    const previousNotes = request.doctor_notes
    
    setIsSubmitting(true)
    
    // OPTIMISTIC UPDATE - Update immediately
    const optimisticUpdate = {
      ...request,
      status: (action === "approve" ? "approved" : "rejected") as RequestStatus,
      doctor_notes: notes
    }
    onUpdate(optimisticUpdate)
    
    toast.success(`Request ${action === "approve" ? "approved" : "declined"}`, {
      description: "Saving changes..."
    })

    try {
      const response = await fetch("/api/doctor/update-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          request_id: request.id,
          action,
          notes,
          doctor_id: doctorId,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || "Failed to update request")
      }

      // Success - close panel after optimistic update
      closePanel()
      toast.success(`Request ${action === "approve" ? "approved" : "declined"}`, {
        description: "Changes saved ✓"
      })
    } catch (error) {
      // ROLLBACK on error
      const rollback = {
        ...request,
        status: previousStatus,
        doctor_notes: previousNotes
      }
      onUpdate(rollback)
      
      const errorMessage = error instanceof Error ? error.message : "That didn't save properly. Give it another go."
      toast.error(errorMessage, {
        description: "Your changes weren't saved"
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const StatusIcon = STATUS_CONFIG[request.status].icon

  return (
    <div className="p-6 space-y-6">
      {/* Status */}
      <div>
        <p className="text-sm text-gray-600 mb-2">Status</p>
        <div className={cn("inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium", STATUS_CONFIG[request.status].color)}>
          <StatusIcon className="w-4 h-4" />
          {STATUS_CONFIG[request.status].label}
        </div>
      </div>

      {/* Patient Info */}
      <div>
        <p className="text-sm text-gray-600 mb-2">Patient Information</p>
        <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
          <p><strong>Name:</strong> {request.patient.full_name}</p>
          <p><strong>Email:</strong> {request.patient.email}</p>
          {request.patient.phone && <p><strong>Phone:</strong> {request.patient.phone}</p>}
        </div>
      </div>

      {/* Request Details */}
      <div>
        <p className="text-sm text-gray-600 mb-2">Request Details</p>
        <div className="bg-gray-50 rounded-lg p-4 text-sm">
          <pre className="whitespace-pre-wrap font-mono text-xs">
            {JSON.stringify(request.answers, null, 2)}
          </pre>
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className="text-sm text-gray-600 mb-2 block">Doctor Notes</label>
        <Textarea
          value={notes}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNotes(e.target.value)}
          placeholder="Add your notes..."
          minRows={4}
          className="resize-none input-glow"
        />
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-4 border-t border-gray-200">
        <Button
          variant="destructive"
          onClick={() => handleAction("reject")}
          disabled={isSubmitting || !notes}
          className="flex-1 scale-spring"
        >
          <XCircle className="w-4 h-4 mr-2" />
          {BUTTON_COPY.reject}
        </Button>
        <Button
          onClick={() => handleAction("approve")}
          disabled={isSubmitting}
          className="flex-1 btn-premium glow-pulse"
        >
          <CheckCircle className="w-4 h-4 mr-2" />
          {BUTTON_COPY.approve}
        </Button>
      </div>
    </div>
  )
}
