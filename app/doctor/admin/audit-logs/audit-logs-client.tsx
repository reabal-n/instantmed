"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
import { Label } from "@/components/ui/label"
import { Pagination } from "@/components/uix"
import {
  ArrowLeft,
  Search,
  Clock,
  User,
  FileText,
  AlertCircle,
  Mail,
  CreditCard,
  Shield,
  Activity,
  Calendar,
  Filter,
} from "lucide-react"
import Link from "next/link"

interface AuditEvent {
  id: string
  intake_id: string
  event_type: string
  actor_role: string
  actor_id: string | null
  from_status: string | null
  to_status: string | null
  metadata: Record<string, unknown>
  created_at: string
  intake?: {
    id: string
    category: string
    patient?: { full_name: string; email: string }[] | { full_name: string; email: string }
  }[] | {
    id: string
    category: string
    patient?: { full_name: string; email: string }[] | { full_name: string; email: string }
  }
  actor?: { full_name: string; role: string }[] | { full_name: string; role: string }
}

interface CertificateEvent {
  id: string
  certificate_id: string
  event_type: string
  actor_id: string | null
  actor_role: string
  metadata: Record<string, unknown>
  created_at: string
  actor?: { full_name: string }[] | { full_name: string }
}

interface AuditLogsClientProps {
  events: AuditEvent[]
  certificateEvents: CertificateEvent[]
  total: number
  page: number
  pageSize: number
  filters: {
    intakeId?: string
    patientId?: string
    dateFrom?: string
    dateTo?: string
    eventType?: string
  }
}

export function AuditLogsClient({
  events,
  certificateEvents,
  total,
  page,
  pageSize,
  filters,
}: AuditLogsClientProps) {
  const router = useRouter()
  const [searchIntakeId, setSearchIntakeId] = useState(filters.intakeId || "")
  const [dateFrom, setDateFrom] = useState(filters.dateFrom || "")
  const [dateTo, setDateTo] = useState(filters.dateTo || "")
  const [eventType, setEventType] = useState(filters.eventType || "all")
  const totalPages = Math.ceil(total / pageSize)

  const hasActiveFilters = !!(filters.intakeId || filters.dateFrom || filters.dateTo || (filters.eventType && filters.eventType !== "all"))

  const handleSearch = () => {
    const params = new URLSearchParams()
    if (searchIntakeId) params.set("intake_id", searchIntakeId)
    if (dateFrom) params.set("date_from", dateFrom)
    if (dateTo) params.set("date_to", dateTo)
    if (eventType && eventType !== "all") params.set("event_type", eventType)
    router.push(`/doctor/admin/audit-logs?${params.toString()}`)
  }

  const handleClearFilters = () => {
    setSearchIntakeId("")
    setDateFrom("")
    setDateTo("")
    setEventType("all")
    router.push("/doctor/admin/audit-logs")
  }

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case "status_change":
        return <Activity className="h-4 w-4" />
      case "payment_received":
        return <CreditCard className="h-4 w-4" />
      case "document_generated":
        return <FileText className="h-4 w-4" />
      case "email_sent":
      case "email_failed":
        return <Mail className="h-4 w-4" />
      case "refund_processed":
        return <CreditCard className="h-4 w-4" />
      case "escalated":
        return <AlertCircle className="h-4 w-4" />
      default:
        return <Clock className="h-4 w-4" />
    }
  }

  const getEventColor = (eventType: string) => {
    switch (eventType) {
      case "status_change":
        return "bg-blue-100 text-blue-700"
      case "payment_received":
        return "bg-emerald-100 text-emerald-700"
      case "document_generated":
        return "bg-dawn-100 text-dawn-700"
      case "email_sent":
        return "bg-sky-100 text-sky-700"
      case "email_failed":
        return "bg-red-100 text-red-700"
      case "refund_processed":
        return "bg-amber-100 text-amber-700"
      default:
        return "bg-gray-100 text-gray-700"
    }
  }

  const getStatusBadge = (status: string | null) => {
    if (!status) return null
    const colors: Record<string, string> = {
      approved: "bg-emerald-100 text-emerald-700",
      declined: "bg-red-100 text-red-700",
      paid: "bg-blue-100 text-blue-700",
      pending_info: "bg-amber-100 text-amber-700",
      completed: "bg-emerald-100 text-emerald-700",
    }
    return (
      <Badge className={colors[status] || "bg-gray-100 text-gray-700"}>
        {status.replace(/_/g, " ")}
      </Badge>
    )
  }

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString("en-AU", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" asChild>
            <Link href="/doctor/admin">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Admin
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Audit Logs</h1>
            <p className="text-muted-foreground">View intake and certificate event history</p>
          </div>
        </div>
        <Badge variant="outline" className="text-sm">
          <Shield className="h-3 w-3 mr-1" />
          Admin Only
        </Badge>
      </div>

      {/* Search & Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            {/* Row 1: Intake ID search + Event type filter */}
            <div className="flex gap-4 flex-wrap">
              <div className="flex-1 min-w-[200px]">
                <Label htmlFor="intake-search" className="text-xs text-muted-foreground mb-1.5 block">
                  Intake ID
                </Label>
                <Input
                  id="intake-search"
                  placeholder="Search by Intake ID..."
                  value={searchIntakeId}
                  onChange={(e) => setSearchIntakeId(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                />
              </div>
              <div className="w-[200px]">
                <Label htmlFor="event-type-filter" className="text-xs text-muted-foreground mb-1.5 block">
                  <Filter className="h-3 w-3 inline mr-1" />
                  Event Type
                </Label>
                <Select value={eventType} onValueChange={setEventType}>
                  <SelectTrigger id="event-type-filter">
                    <SelectValue placeholder="All events" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="status_change">Status Change</SelectItem>
                    <SelectItem value="payment_received">Payment</SelectItem>
                    <SelectItem value="document_generated">Document Generated</SelectItem>
                    <SelectItem value="email_sent">Email</SelectItem>
                    <SelectItem value="refund_processed">Refund</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Row 2: Date range + actions */}
            <div className="flex gap-4 items-end flex-wrap">
              <div className="w-[180px]">
                <Label htmlFor="date-from" className="text-xs text-muted-foreground mb-1.5 block">
                  <Calendar className="h-3 w-3 inline mr-1" />
                  From
                </Label>
                <Input
                  id="date-from"
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
              </div>
              <div className="w-[180px]">
                <Label htmlFor="date-to" className="text-xs text-muted-foreground mb-1.5 block">
                  <Calendar className="h-3 w-3 inline mr-1" />
                  To
                </Label>
                <Input
                  id="date-to"
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                />
              </div>
              <div className="flex gap-2 ml-auto">
                <Button onClick={handleSearch}>
                  <Search className="h-4 w-4 mr-2" />
                  Search
                </Button>
                {hasActiveFilters && (
                  <Button variant="outline" onClick={handleClearFilters}>
                    Clear
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Certificate Events (if viewing specific intake) */}
      {certificateEvents.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-5 w-5" />
              Certificate Events
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {certificateEvents.map((event) => {
                const actorData = event.actor
                const certActor = Array.isArray(actorData) ? actorData[0] : actorData
                return (
                <div
                  key={event.id}
                  className="flex items-start gap-4 p-3 bg-muted/50 rounded-lg"
                >
                  <div className={`p-2 rounded-full ${getEventColor(event.event_type)}`}>
                    {getEventIcon(event.event_type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{event.event_type.replace(/_/g, " ")}</span>
                      <Badge variant="outline" className="text-xs">
                        {event.actor_role}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {certActor?.full_name || "System"} • {formatDateTime(event.created_at)}
                    </div>
                    {event.metadata && Object.keys(event.metadata).length > 0 && (
                      <pre className="text-xs bg-muted p-2 rounded mt-2 overflow-x-auto">
                        {JSON.stringify(event.metadata, null, 2)}
                      </pre>
                    )}
                  </div>
                </div>
              )})}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Intake Events */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="h-5 w-5" />
            Intake Events
            <Badge variant="secondary" className="ml-2">{total} total</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {events.length > 0 ? (
            <div className="space-y-3">
              {events.map((event) => {
                // Handle Supabase nested relations (can be array or object)
                const intakeData = event.intake
                const intake = Array.isArray(intakeData) ? intakeData[0] : intakeData
                const patientData = intake?.patient
                const patient = Array.isArray(patientData) ? patientData[0] : patientData
                const actorData = event.actor
                const actor = Array.isArray(actorData) ? actorData[0] : actorData
                
                return (
                  <div
                    key={event.id}
                    className="flex items-start gap-4 p-4 bg-muted/50 rounded-lg"
                  >
                    <div className={`p-2 rounded-full ${getEventColor(event.event_type)}`}>
                      {getEventIcon(event.event_type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium capitalize">
                          {event.event_type.replace(/_/g, " ")}
                        </span>
                        {event.from_status && event.to_status && (
                          <div className="flex items-center gap-1 text-sm">
                            {getStatusBadge(event.from_status)}
                            <span className="text-muted-foreground">→</span>
                            {getStatusBadge(event.to_status)}
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {actor?.full_name || "System"}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDateTime(event.created_at)}
                        </span>
                      </div>

                      {patient && (
                        <div className="text-sm mt-2">
                          <span className="text-muted-foreground">Patient: </span>
                          <Link 
                            href={`/doctor/intakes/${event.intake_id}`}
                            className="text-primary hover:underline"
                          >
                            {patient.full_name}
                          </Link>
                        </div>
                      )}

                      {event.metadata && Object.keys(event.metadata).length > 0 && (
                        <details className="mt-2">
                          <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                            View metadata
                          </summary>
                          <pre className="text-xs bg-muted p-2 rounded mt-1 overflow-x-auto">
                            {JSON.stringify(event.metadata, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>

                    <Link href={`/doctor/intakes/${event.intake_id}`}>
                      <Button variant="ghost" size="sm">
                        View
                      </Button>
                    </Link>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Activity className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p>No audit events found</p>
              {hasActiveFilters && (
                <p className="text-sm mt-2">Try adjusting your search filters</p>
              )}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center mt-6">
              <Pagination
                total={totalPages}
                page={page}
                onChange={(newPage) => {
                  const params = new URLSearchParams()
                  if (filters.intakeId) params.set("intake_id", filters.intakeId)
                  if (filters.dateFrom) params.set("date_from", filters.dateFrom)
                  if (filters.dateTo) params.set("date_to", filters.dateTo)
                  if (filters.eventType && filters.eventType !== "all") params.set("event_type", filters.eventType)
                  params.set("page", String(newPage))
                  router.push(`/doctor/admin/audit-logs?${params.toString()}`)
                }}
                showControls
                size="sm"
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
