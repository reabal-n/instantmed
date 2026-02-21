"use client"

import { useState, useEffect, useTransition, useMemo, useCallback, useRef, useId } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { UserCard, Pagination } from "@/components/uix"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Clock,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Flag,
  FileText,
  Search,
  MoreVertical,
  RefreshCw,
  Zap,
  ShieldAlert,
  Sparkles,
  Loader2,
} from "lucide-react"
import { updateStatusAction, declineIntakeAction, flagForFollowupAction, getDeclineReasonTemplatesAction } from "./actions"
import { getInfoRequestTemplatesAction, requestMoreInfoAction } from "@/app/actions/request-more-info"
import { MessageSquare } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { QueueClientProps } from "./types"
import { formatServiceType } from "@/lib/format-intake"
import { toast } from "sonner"
import type { IntakeStatus } from "@/types/db"
import { cn } from "@/lib/utils"

export function QueueClient({
  intakes: initialIntakes,
  doctorId,
  identityComplete = true,
  pagination,
}: QueueClientProps) {
  const router = useRouter()
  const [intakes, setIntakes] = useState(initialIntakes)

  const totalPages = pagination ? Math.ceil(pagination.total / pagination.pageSize) : 1
  const currentPage = pagination?.page ?? 1
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [isPending, startTransition] = useTransition()
  const [declineDialog, setDeclineDialog] = useState<string | null>(null)
  const [declineReasonCode, setDeclineReasonCode] = useState("")
  const [declineReasonNote, setDeclineReasonNote] = useState("")
  const [declineTemplates, setDeclineTemplates] = useState<Array<{ code: string; label: string; description: string | null; requires_note: boolean }>>([])
  const [infoDialog, setInfoDialog] = useState<string | null>(null)
  const [infoTemplateCode, setInfoTemplateCode] = useState("")
  const [infoMessage, setInfoMessage] = useState("")
  const [infoTemplates, setInfoTemplates] = useState<Array<{ code: string; label: string; description: string | null; message_template: string | null }>>([])
  const [flagDialog, setFlagDialog] = useState<string | null>(null)
  const [flagReason, setFlagReason] = useState("")
  const [newIntakeCount, setNewIntakeCount] = useState(0)
  const lastSyncTimeRef = useRef<Date>(new Date())
  const [isStale, setIsStale] = useState(false)
  const [isReconnecting, setIsReconnecting] = useState(false)
  const listId = useId()

  // Real-time subscription
  useEffect(() => {
    const supabase = createClient()
    const staleCheckInterval: NodeJS.Timeout = setInterval(() => {
      const now = new Date()
      const timeSinceSync = now.getTime() - lastSyncTimeRef.current.getTime()
      if (timeSinceSync > 60000) {
        setIsStale(true)
      }
    }, 30000)

    const channel = supabase
      .channel("queue-updates")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "intakes",
          filter: "status=in.(paid,in_review,pending_info)",
        },
        (payload) => {
          lastSyncTimeRef.current = new Date()
          setIsStale(false)

          if (payload.eventType === "INSERT") {
            const newPatientName = (payload.new as { patient_name?: string }).patient_name
            const serviceData = (payload.new as { service?: { short_name?: string } }).service
            const serviceName = serviceData?.short_name || "New request"
            toast.info(
              newPatientName
                ? `${serviceName} from ${newPatientName}`
                : `${serviceName} added to queue`,
              { duration: 5000 }
            )
            setNewIntakeCount(c => c + 1)
            router.refresh()
          } else if (payload.eventType === "UPDATE") {
            setIntakes((prev) => prev.map((r) => (r.id === payload.new.id ? { ...r, ...payload.new } : r)))
          } else if (payload.eventType === "DELETE") {
            setIntakes((prev) => prev.filter((r) => r.id !== payload.old.id))
          }
        },
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          lastSyncTimeRef.current = new Date()
          setIsStale(false)
          setIsReconnecting(false)
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          setIsStale(true)
          setIsReconnecting(true)
        }
      })

    return () => {
      supabase.removeChannel(channel)
      clearInterval(staleCheckInterval)
    }
  }, [router])

  const calculateWaitTime = (createdAt: string) => {
    const created = new Date(createdAt)
    const now = new Date()
    const diffMs = now.getTime() - created.getTime()
    const diffMins = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours > 0) return `${diffHours}h ${diffMins % 60}m`
    return `${diffMins}m`
  }

  const getWaitTimeSeverity = (createdAt: string, slaDeadline?: string | null) => {
    if (slaDeadline) {
      const deadline = new Date(slaDeadline)
      const now = new Date()
      const diffMins = Math.floor((deadline.getTime() - now.getTime()) / (1000 * 60))
      if (diffMins < 0) return "critical"
      if (diffMins < 30) return "warning"
      return "normal"
    }
    const created = new Date(createdAt)
    const now = new Date()
    const diffMins = Math.floor((now.getTime() - created.getTime()) / (1000 * 60))
    if (diffMins > 60) return "critical"
    if (diffMins > 30) return "warning"
    return "normal"
  }

  const calculateSlaCountdown = (slaDeadline: string | null | undefined): string | null => {
    if (!slaDeadline) return null
    const deadline = new Date(slaDeadline)
    const now = new Date()
    const diffMs = deadline.getTime() - now.getTime()
    const diffMins = Math.floor(diffMs / (1000 * 60))
    if (diffMins < 0) {
      const overdueMins = Math.abs(diffMins)
      const overdueHours = Math.floor(overdueMins / 60)
      return overdueHours > 0 ? `${overdueHours}h ${overdueMins % 60}m overdue` : `${overdueMins}m overdue`
    }
    const hours = Math.floor(diffMins / 60)
    return hours > 0 ? `${hours}h ${diffMins % 60}m left` : `${diffMins}m left`
  }

  const calculateAge = (dob: string | null): number | null => {
    if (!dob) return null
    const birthDate = new Date(dob)
    const today = new Date()
    let age = today.getFullYear() - birthDate.getFullYear()
    const monthDiff = today.getMonth() - birthDate.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) age--
    return age
  }

  const handleApprove = async (intakeId: string, serviceType?: string | null) => {
    if (serviceType === "med_certs") {
      // Navigate to intake detail — doctor uses the certificate preview dialog there
      router.push(`/doctor/intakes/${intakeId}`)
      return
    }
    startTransition(async () => {
      const newStatus: IntakeStatus = serviceType === "common_scripts" || serviceType === "repeat_rx"
        ? "awaiting_script"
        : "approved"
      const result = await updateStatusAction(intakeId, newStatus, doctorId)
      if (result.success) {
        setIntakes((prev) => prev.filter((r) => r.id !== intakeId))
        if (serviceType === "common_scripts" || serviceType === "repeat_rx") {
          router.push(`/doctor/intakes/${intakeId}`)
        } else {
          toast.success("Request approved")
        }
      } else {
        toast.error(result.error || "Failed to approve")
      }
    })
  }

  // Fetch templates on mount
  useEffect(() => {
    getDeclineReasonTemplatesAction().then((result) => {
      if (result.success && result.templates) setDeclineTemplates(result.templates)
    })
    getInfoRequestTemplatesAction().then((result) => {
      if (result.success && result.templates) setInfoTemplates(result.templates)
    })
  }, [])

  const selectedTemplate = declineTemplates.find(t => t.code === declineReasonCode)
  const requiresNote = selectedTemplate?.requires_note || declineReasonCode === "other"

  const handleDeclineTemplateChange = (code: string) => {
    setDeclineReasonCode(code)
    const template = declineTemplates.find(t => t.code === code)
    if (template?.description && !declineReasonNote) setDeclineReasonNote(template.description)
  }

  const handleInfoTemplateChange = (code: string) => {
    setInfoTemplateCode(code)
    const template = infoTemplates.find(t => t.code === code)
    if (template?.message_template) setInfoMessage(template.message_template)
  }

  const handleRequestInfo = async () => {
    if (!infoDialog || !infoTemplateCode) return
    startTransition(async () => {
      const result = await requestMoreInfoAction(infoDialog, infoTemplateCode, infoMessage)
      if (result.success) {
        toast.success("Information request sent to patient")
        setInfoDialog(null)
        setInfoTemplateCode("")
        setInfoMessage("")
        router.refresh()
      } else {
        toast.error(result.error || "Failed to send request")
      }
    })
  }

  const hasRedFlags = useCallback((intake: typeof intakes[0]): boolean => {
    if (intake.flagged_for_followup) return true
    if (intake.risk_tier === "high" || intake.risk_tier === "critical") return true
    if (intake.risk_flags && Array.isArray(intake.risk_flags) && intake.risk_flags.length > 0) return true
    if (intake.risk_score >= 7) return true
    if (intake.requires_live_consult) return true
    return false
  }, [])

  // Sort: priority → flagged → SLA deadline → wait time
  const sortedIntakes = useMemo(() => {
    return [...intakes].sort((a, b) => {
      if (a.is_priority && !b.is_priority) return -1
      if (!a.is_priority && b.is_priority) return 1
      const aFlagged = hasRedFlags(a)
      const bFlagged = hasRedFlags(b)
      if (aFlagged && !bFlagged) return -1
      if (!aFlagged && bFlagged) return 1
      const aSla = a.sla_deadline ? new Date(a.sla_deadline).getTime() : Infinity
      const bSla = b.sla_deadline ? new Date(b.sla_deadline).getTime() : Infinity
      if (aSla !== bSla) return aSla - bSla
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    })
  }, [intakes, hasRedFlags])

  const filteredIntakes = sortedIntakes.filter((r) => {
    if (!searchQuery.trim()) return true
    const query = searchQuery.toLowerCase()
    const service = r.service as { name?: string; type?: string } | undefined
    return (
      r.patient.full_name.toLowerCase().includes(query) ||
      r.patient.medicare_number?.includes(query) ||
      formatServiceType(service?.type || "").toLowerCase().includes(query)
    )
  })

  const handleDecline = async () => {
    if (!declineDialog || !declineReasonCode) return
    if (requiresNote && !declineReasonNote.trim()) return
    startTransition(async () => {
      const result = await declineIntakeAction(declineDialog, declineReasonCode, declineReasonNote || undefined)
      if (result.success) {
        setIntakes((prev) => prev.filter((r) => r.id !== declineDialog))
        setDeclineDialog(null)
        setDeclineReasonCode("")
        setDeclineReasonNote("")
      }
    })
  }

  const handleFlag = async () => {
    if (!flagDialog || !flagReason.trim()) return
    startTransition(async () => {
      const result = await flagForFollowupAction(flagDialog, flagReason)
      if (result.success) {
        setIntakes((prev) => prev.map((r) => (r.id === flagDialog ? { ...r, flagged_for_followup: true } : r)))
        setFlagDialog(null)
        setFlagReason("")
      }
    })
  }

  return (
    <div className="space-y-4">
      {/* Stale Data Warning */}
      {isStale && (
        <div
          role="alert"
          className="flex items-center gap-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-200/60 dark:border-amber-500/20"
        >
          <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-medium text-amber-800 dark:text-amber-200">
              {isReconnecting ? "Reconnecting to live updates..." : "Queue may be out of date"}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.refresh()}
            className="shrink-0 h-7 text-[12px]"
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Refresh
          </Button>
        </div>
      )}

      {/* New Intakes Banner */}
      {newIntakeCount > 0 && (
        <div
          role="status"
          className="flex items-center justify-between p-3 rounded-lg bg-primary/5 border border-primary/20"
        >
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-primary" />
            </span>
            <p className="text-sm font-medium text-foreground">
              {newIntakeCount} new {newIntakeCount === 1 ? "request" : "requests"} arrived
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => { setNewIntakeCount(0); router.refresh() }}
            className="h-7 text-xs"
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Refresh
          </Button>
        </div>
      )}

      {/* Header + Search */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3" data-testid="queue-header">
        <h2 className="text-lg font-semibold tracking-tight text-foreground font-sans" id={listId} data-testid="queue-heading">
          {filteredIntakes.length} case{filteredIntakes.length !== 1 ? "s" : ""} waiting
        </h2>
        <div className="flex items-center gap-2">
          <Input
            placeholder="Search patients..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full sm:w-56 h-8 text-[13px]"
            startContent={<Search className="h-3.5 w-3.5 text-muted-foreground" />}
          />
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => router.refresh()}>
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Queue List */}
      <div className="space-y-2" aria-labelledby={listId}>
        {filteredIntakes.length === 0 ? (
          <Card className="py-12">
            <CardContent className="text-center text-muted-foreground">
              <CheckCircle className="h-12 w-12 mx-auto mb-4 text-emerald-500" />
              <p className="font-medium">Queue is clear!</p>
              <p className="text-sm">No pending cases at the moment.</p>
            </CardContent>
          </Card>
        ) : (
          filteredIntakes.map((intake) => {
            const isExpanded = expandedId === intake.id
            const waitSeverity = getWaitTimeSeverity(intake.created_at, intake.sla_deadline)
            const patientAge = calculateAge(intake.patient.date_of_birth)
            const service = intake.service as { name?: string; type?: string; short_name?: string } | undefined

            return (
              <Card
                key={intake.id}
                className={cn("transition-all", isExpanded && "ring-2 ring-primary/20")}
              >
                {/* Collapsed row */}
                <CardHeader
                  className="cursor-pointer hover:bg-muted/50 transition-colors py-3 px-4"
                  onClick={() => setExpandedId(isExpanded ? null : intake.id)}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                      )}
                      <UserCard
                        name={intake.patient.full_name}
                        description={patientAge != null ? `${patientAge}y` : ""}
                        size="sm"
                        className="shrink-0"
                      />
                      <div className="min-w-0 flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="text-xs">
                          {service?.short_name || formatServiceType(service?.type || "")}
                        </Badge>
                        {intake.is_priority && (
                          <Badge className="bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700">
                            <Zap className="w-3 h-3 mr-1" />
                            Priority
                          </Badge>
                        )}
                        {hasRedFlags(intake) && (
                          <Badge className="bg-destructive/10 text-destructive border-destructive/20">
                            <ShieldAlert className="w-3 h-3 mr-1" />
                            Flagged
                          </Badge>
                        )}
                        {intake.ai_draft_status === "completed" && (
                          <Badge className="bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-900/30 dark:text-violet-300 dark:border-violet-700">
                            <Sparkles className="w-3 h-3 mr-1" />
                            AI ready
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {intake.sla_deadline ? (
                        <div className={cn(
                          "flex items-center gap-1.5 text-sm font-medium",
                          waitSeverity === "critical" ? "text-destructive"
                            : waitSeverity === "warning" ? "text-amber-600 dark:text-amber-400"
                            : "text-emerald-600 dark:text-emerald-400"
                        )}>
                          <Clock className="h-4 w-4" />
                          <span>{calculateSlaCountdown(intake.sla_deadline)}</span>
                        </div>
                      ) : (
                        <div className={cn(
                          "flex items-center gap-1.5 text-sm",
                          waitSeverity === "critical" ? "text-destructive"
                            : waitSeverity === "warning" ? "text-amber-600 dark:text-amber-400"
                            : "text-muted-foreground"
                        )}>
                          <Clock className="h-4 w-4" />
                          <span className="font-medium">{calculateWaitTime(intake.created_at)}</span>
                        </div>
                      )}
                      {waitSeverity === "critical" && (
                        <AlertTriangle className="h-4 w-4 text-destructive" aria-label="Critical" />
                      )}
                    </div>
                  </div>
                </CardHeader>

                {/* Expanded — just link + actions, detailed review on the detail page */}
                {isExpanded && (
                  <CardContent className="pt-0 pb-4 space-y-3">
                    <Link
                      href={`/doctor/intakes/${intake.id}`}
                      className="inline-flex items-center text-sm text-primary hover:underline"
                    >
                      <FileText className="h-3.5 w-3.5 mr-1" />
                      View full details & questionnaire
                    </Link>

                    <div className="flex flex-wrap items-center gap-2 pt-2 border-t">
                      <Button
                        onClick={() => handleApprove(intake.id, service?.type)}
                        disabled={isPending || !identityComplete}
                        className="bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-700 dark:hover:bg-emerald-600 disabled:opacity-50"
                        title={!identityComplete ? "Complete your Certificate Identity in Settings first" : undefined}
                      >
                        {isPending ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-1.5" />}
                        {service?.type === "med_certs" ? "Review & Build" : service?.type === "common_scripts" ? "Approve Script" : "Approve"}
                      </Button>
                      <Button variant="destructive" onClick={() => setDeclineDialog(intake.id)} disabled={isPending}>
                        <XCircle className="h-4 w-4 mr-1.5" />
                        Decline
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setInfoDialog(intake.id)}>
                            <MessageSquare className="h-4 w-4 mr-2" />
                            Request more info
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setFlagDialog(intake.id)}>
                            <Flag className="h-4 w-4 mr-2" />
                            Flag for follow-up
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardContent>
                )}
              </Card>
            )
          })
        )}
      </div>

      {/* Pagination */}
      {pagination && totalPages > 1 && (
        <div className="flex items-center justify-between py-4 px-2 border-t">
          <div className="text-sm text-muted-foreground">
            {(currentPage - 1) * pagination.pageSize + 1} – {Math.min(currentPage * pagination.pageSize, pagination.total)} of {pagination.total}
          </div>
          <Pagination
            total={totalPages}
            page={currentPage}
            onChange={(page) => {
              const params = new URLSearchParams(window.location.search)
              params.set("page", String(page))
              router.push(`/doctor?${params.toString()}`)
            }}
            showControls
            size="sm"
          />
        </div>
      )}

      {/* Decline Dialog */}
      <Dialog open={!!declineDialog} onOpenChange={() => {
        setDeclineDialog(null)
        setDeclineReasonCode("")
        setDeclineReasonNote("")
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Decline Request</DialogTitle>
            <DialogDescription>
              Select a reason. The patient will be notified by email.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Reason</label>
              <Select value={declineReasonCode} onValueChange={handleDeclineTemplateChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a reason..." />
                </SelectTrigger>
                <SelectContent>
                  {declineTemplates.map((template) => (
                    <SelectItem key={template.code} value={template.code}>
                      {template.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">
                Note {requiresNote ? "(required)" : "(optional)"}
              </label>
              <Textarea
                placeholder="Additional details for the patient..."
                value={declineReasonNote}
                onChange={(e) => setDeclineReasonNote(e.target.value)}
                className="min-h-[100px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setDeclineDialog(null)
              setDeclineReasonCode("")
              setDeclineReasonNote("")
            }}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDecline}
              disabled={!declineReasonCode || (requiresNote && !declineReasonNote.trim()) || isPending}
            >
              Decline & Notify
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Info Request Dialog */}
      <Dialog open={!!infoDialog} onOpenChange={() => {
        setInfoDialog(null)
        setInfoTemplateCode("")
        setInfoMessage("")
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request More Information</DialogTitle>
            <DialogDescription>
              The patient will be notified by email.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">What do you need?</label>
              <Select value={infoTemplateCode} onValueChange={handleInfoTemplateChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  {infoTemplates.map((template) => (
                    <SelectItem key={template.code} value={template.code}>
                      {template.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Message to patient</label>
              <Textarea
                placeholder="Explain what you need..."
                value={infoMessage}
                onChange={(e) => setInfoMessage(e.target.value)}
                className="min-h-[100px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setInfoDialog(null)
              setInfoTemplateCode("")
              setInfoMessage("")
            }}>
              Cancel
            </Button>
            <Button
              onClick={handleRequestInfo}
              disabled={!infoTemplateCode || !infoMessage.trim() || isPending}
            >
              Send Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Flag Dialog */}
      <Dialog open={!!flagDialog} onOpenChange={() => setFlagDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Flag for Follow-up</DialogTitle>
            <DialogDescription>Add a note about why this case needs follow-up.</DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Follow-up reason..."
            value={flagReason}
            onChange={(e) => setFlagReason(e.target.value)}
            className="min-h-[100px]"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setFlagDialog(null)}>
              Cancel
            </Button>
            <Button onClick={handleFlag} disabled={!flagReason.trim() || isPending}>
              Flag
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
