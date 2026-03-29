"use client"

import { useState, useEffect, useTransition, useMemo, useCallback, useRef, useId } from "react"
import { useRouter } from "next/navigation"
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
  Volume2,
  VolumeOff,
} from "lucide-react"
import { updateStatusAction, declineIntakeAction, flagForFollowupAction, getDeclineReasonTemplatesAction } from "./actions"
import { getInfoRequestTemplatesAction, requestMoreInfoAction } from "@/app/actions/request-more-info"
import { revokeAIApproval } from "@/app/actions/revoke-ai-approval"
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
import { calculateAge } from "@/lib/format"
import { toast } from "sonner"
import type { IntakeStatus, IntakeWithPatient } from "@/types/db"
import { EmptyState } from "@/components/ui/empty-state"
import { cn } from "@/lib/utils"
import { capture } from "@/lib/analytics/capture"
import { usePanel } from "@/components/panels/panel-provider"
import { useDebounce } from "@/hooks/use-debounce"
import { IntakeReviewPanel } from "@/components/doctor/intake-review-panel"

export function QueueClient({
  intakes: initialIntakes,
  doctorId: _doctorId,
  identityComplete = true,
  pagination,
  aiApprovedIntakes = [],
}: QueueClientProps) {
  const router = useRouter()
  const { openPanel } = usePanel()
  const [intakes, setIntakes] = useState(initialIntakes)

  // Sync server data into local state after router.refresh() soft-refreshes the page.
  // useState(initialIntakes) only reads the prop on mount, so without this effect
  // the 60s background refresh never updates what's shown in the queue.
  useEffect(() => {
    setIntakes(initialIntakes)
  }, [initialIntakes])

  const totalPages = pagination ? Math.ceil(pagination.total / pagination.pageSize) : 1
  const currentPage = pagination?.page ?? 1
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const debouncedSearch = useDebounce(searchQuery, 200)
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
  const [revokeDialog, setRevokeDialog] = useState<string | null>(null)
  const [revokeReason, setRevokeReason] = useState("")
  const [declineTemplatesLoaded, setDeclineTemplatesLoaded] = useState(false)
  const [infoTemplatesLoaded, setInfoTemplatesLoaded] = useState(false)
  const lastSyncTimeRef = useRef<Date>(new Date())
  const [isStale, setIsStale] = useState(false)
  const [isReconnecting, setIsReconnecting] = useState(false)
  const [, setTick] = useState(0) // Forces re-render for live wait time ticking
  const [soundMuted, setSoundMuted] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("instantmed:queue-sound-muted") === "true"
    }
    return false
  })
  const listId = useId()

  // Tick every 30s to update wait time displays live
  useEffect(() => {
    const tickInterval = setInterval(() => {
      setTick((t) => t + 1)
    }, 30000)
    return () => clearInterval(tickInterval)
  }, [])

  // Play a subtle notification sound when a new intake arrives
  const playNotificationSound = useCallback(() => {
    if (soundMuted) return
    try {
      const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
      const oscillator = audioCtx.createOscillator()
      const gainNode = audioCtx.createGain()
      oscillator.connect(gainNode)
      gainNode.connect(audioCtx.destination)
      oscillator.frequency.setValueAtTime(880, audioCtx.currentTime) // A5
      oscillator.frequency.setValueAtTime(1175, audioCtx.currentTime + 0.1) // D6
      gainNode.gain.setValueAtTime(0.08, audioCtx.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3)
      oscillator.start(audioCtx.currentTime)
      oscillator.stop(audioCtx.currentTime + 0.3)
    } catch {
      // Audio not available — silent fallback
    }
  }, [soundMuted])

  // Real-time subscription — client-side state updates (no router.refresh on INSERT)
  useEffect(() => {
    const supabase = createClient()
    const staleCheckInterval: NodeJS.Timeout = setInterval(() => {
      const now = new Date()
      const timeSinceSync = now.getTime() - lastSyncTimeRef.current.getTime()
      if (timeSinceSync > 90000) {
        setIsStale(true)
      }
    }, 30000)

    // Background soft-refresh every 60s to catch missed updates
    const softRefreshInterval: NodeJS.Timeout = setInterval(() => {
      router.refresh()
    }, 60000)

    const channel = supabase
      .channel("queue-updates")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "intakes",
          filter: "status=in.(paid,in_review,pending_info,awaiting_script)",
        },
        (payload) => {
          lastSyncTimeRef.current = new Date()
          setIsStale(false)

          if (payload.eventType === "INSERT") {
            const newRow = payload.new as IntakeWithPatient
            const serviceData = newRow.service as { short_name?: string } | undefined
            const serviceName = serviceData?.short_name || "New request"
            const patientName = newRow.patient?.full_name
            playNotificationSound()
            toast.info(
              patientName
                ? `${serviceName} from ${patientName}`
                : `${serviceName} added to queue`,
              { duration: 5000 }
            )
            // Add directly to local state — no full page refresh needed
            setIntakes((prev) => {
              // Avoid duplicates if real-time fires twice
              if (prev.some((r) => r.id === newRow.id)) return prev
              return [newRow, ...prev]
            })
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
      clearInterval(softRefreshInterval)
    }
  }, [router, playNotificationSound])

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



  const handleApprove = async (intakeId: string, serviceType?: string | null) => {
    if (serviceType === "med_certs") {
      // Open review panel — doctor uses the certificate preview dialog there
      openReviewPanel(intakeId)
      return
    }
    startTransition(async () => {
      const newStatus: IntakeStatus = serviceType === "common_scripts" || serviceType === "repeat_rx"
        ? "awaiting_script"
        : "approved"
      const result = await updateStatusAction(intakeId, newStatus)
      if (result.success) {
        setIntakes((prev) => prev.filter((r) => r.id !== intakeId))
        if (serviceType === "common_scripts" || serviceType === "repeat_rx") {
          // Open panel for script workflow (mark sent, etc.)
          openReviewPanel(intakeId)
        } else {
          toast.success("Request approved")
        }
      } else {
        toast.error(result.error || "Failed to approve")
      }
    })
  }

  // Lazy-load decline templates only when dialog opens
  useEffect(() => {
    if (declineDialog && !declineTemplatesLoaded) {
      getDeclineReasonTemplatesAction().then((result) => {
        if (result.success && result.templates) {
          setDeclineTemplates(result.templates)
          setDeclineTemplatesLoaded(true)
        }
      })
    }
  }, [declineDialog, declineTemplatesLoaded])

  // Lazy-load info templates only when dialog opens
  useEffect(() => {
    if (infoDialog && !infoTemplatesLoaded) {
      getInfoRequestTemplatesAction().then((result) => {
        if (result.success && result.templates) {
          setInfoTemplates(result.templates)
          setInfoTemplatesLoaded(true)
        }
      })
    }
  }, [infoDialog, infoTemplatesLoaded])

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

  // Open intake review in a slide-over panel (stays on queue)
  const openReviewPanel = useCallback((intakeId: string) => {
    openPanel({
      id: `intake-review-${intakeId}`,
      type: "sheet",
      component: (
        <IntakeReviewPanel
          intakeId={intakeId}
          onActionComplete={() => router.refresh()}
        />
      ),
    })
  }, [openPanel, router])

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
    if (!debouncedSearch.trim()) return true
    const query = debouncedSearch.toLowerCase()
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
    const declinedId = declineDialog
    startTransition(async () => {
      const result = await declineIntakeAction(declinedId, declineReasonCode, declineReasonNote || undefined)
      if (result.success) {
        capture("doctor_decline_submitted", {
          intake_id: declinedId,
          reason_code: declineReasonCode,
        })
        // Store declined intake for potential undo
        const declinedIntake = intakes.find((r) => r.id === declinedId)
        setIntakes((prev) => prev.filter((r) => r.id !== declinedId))
        setDeclineDialog(null)
        setDeclineReasonCode("")
        setDeclineReasonNote("")
        toast.success("Case declined and patient notified", {
          action: declinedIntake ? {
            label: "Undo",
            onClick: () => {
              startTransition(async () => {
                const undoResult = await updateStatusAction(declinedId, "paid")
                if (undoResult.success) {
                  setIntakes((prev) => [declinedIntake, ...prev])
                  toast.success("Decline reversed — case restored to queue")
                  router.refresh()
                } else {
                  toast.error(undoResult.error || "Failed to undo decline")
                }
              })
            },
          } : undefined,
          duration: 8000,
        })
      } else {
        toast.error(result.error || "Failed to decline")
      }
    })
  }

  const handleFlag = async () => {
    if (!flagDialog || !flagReason.trim()) return
    startTransition(async () => {
      const result = await flagForFollowupAction(flagDialog, flagReason)
      if (result.success) {
        setIntakes((prev) => prev.map((r) => (r.id === flagDialog ? { ...r, flagged_for_followup: true } : r)))
        toast.success("Flagged for follow-up")
        setFlagDialog(null)
        setFlagReason("")
      } else {
        toast.error(result.error || "Failed to flag case")
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* Stale Data Warning */}
      {isStale && (
        <div
          role="alert"
          className="flex items-center gap-3 p-3 rounded-lg bg-warning-light border border-warning-border/60"
        >
          <AlertTriangle className="h-4 w-4 text-warning shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-warning">
              {isReconnecting ? "Reconnecting to live updates..." : "Queue may be out of date"}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.refresh()}
            className="shrink-0 h-7 text-xs"
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Refresh
          </Button>
        </div>
      )}

      {/* Header + Search */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2" data-testid="queue-header">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-semibold tracking-tight text-foreground font-sans" id={listId} data-testid="queue-heading">
            {filteredIntakes.length} case{filteredIntakes.length !== 1 ? "s" : ""} waiting
          </h2>
          {/* Live connection indicator */}
          {!isStale && !isReconnecting && (
            <span className="inline-flex items-center gap-1.5 text-xs text-success font-medium">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
              </span>
              Live
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Input
            placeholder="Search patients..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full sm:w-56 h-9 text-sm"
            startContent={<Search className="h-3.5 w-3.5 text-muted-foreground" />}
          />
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={() => {
              const newMuted = !soundMuted
              setSoundMuted(newMuted)
              localStorage.setItem("instantmed:queue-sound-muted", String(newMuted))
            }}
            aria-label={soundMuted ? "Unmute notifications" : "Mute notifications"}
            title={soundMuted ? "Unmute notifications" : "Mute notifications"}
          >
            {soundMuted ? <VolumeOff className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => router.refresh()}>
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Queue List */}
      <div className="space-y-3" aria-labelledby={listId}>
        {filteredIntakes.length === 0 ? (
          <EmptyState
            icon={CheckCircle}
            title="Queue is clear!"
            description="No requests pending review. New requests will appear here automatically."
          />
        ) : (
          filteredIntakes.map((intake) => {
            const isExpanded = expandedId === intake.id
            const waitSeverity = getWaitTimeSeverity(intake.created_at, intake.sla_deadline)
            const patientAge = calculateAge(intake.patient.date_of_birth)
            const service = intake.service as { name?: string; type?: string; short_name?: string } | undefined

            return (
                <Card
                key={intake.id}
                className={cn(
                  "rounded-xl border-border transition-all duration-200",
                  isExpanded && "ring-2 ring-primary/30"
                )}
              >
                {/* Collapsed row */}
                <CardHeader
                  className="cursor-pointer hover:bg-muted/50 transition-colors py-4 px-5"
                  onClick={() => {
                    if (!isExpanded) {
                      capture("doctor_case_opened", {
                        intake_id: intake.id,
                        service_type: (intake.service as { type?: string })?.type,
                      })
                    }
                    setExpandedId(isExpanded ? null : intake.id)
                  }}
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
                          <Badge className="bg-warning-light text-warning border-warning-border">
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
                          <Badge className="bg-info-light text-info border-info-border">
                            <Sparkles className="w-3 h-3 mr-1" />
                            AI ready
                          </Badge>
                        )}
                        {intake.ai_approved && (
                          <Badge className="bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-400 border-violet-200 dark:border-violet-500/20">
                            <Sparkles className="w-3 h-3 mr-1" />
                            AI approved
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {intake.sla_deadline ? (
                        <div className={cn(
                          "flex items-center gap-1.5 text-sm font-medium",
                          waitSeverity === "critical" ? "text-destructive"
                            : waitSeverity === "warning" ? "text-warning"
                            : "text-success"
                        )}>
                          <Clock className="h-4 w-4" />
                          <span>{calculateSlaCountdown(intake.sla_deadline)}</span>
                        </div>
                      ) : (
                        <div className={cn(
                          "flex items-center gap-1.5 text-sm",
                          waitSeverity === "critical" ? "text-destructive"
                            : waitSeverity === "warning" ? "text-warning"
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
                  <CardContent className="pt-0 pb-5 px-5 space-y-3">
                    <button
                      type="button"
                      onClick={() => openReviewPanel(intake.id)}
                      className="inline-flex items-center text-sm text-primary hover:underline"
                    >
                      <FileText className="h-3.5 w-3.5 mr-1" />
                      Review case
                    </button>

                    <div className="flex flex-wrap items-center gap-2.5 pt-3 border-t">
                      <Button
                        onClick={() => handleApprove(intake.id, service?.type)}
                        disabled={isPending || !identityComplete}
                        className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50"
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

      {/* AI-Approved Review Section — above pagination so doctors always see it */}
      {aiApprovedIntakes.length > 0 && (
        <Card className="border-violet-200/50 dark:border-violet-500/20">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-violet-600 dark:text-violet-400" />
              <h3 className="text-sm font-semibold text-foreground">AI-Approved Certificates ({aiApprovedIntakes.length})</h3>
            </div>
            <p className="text-xs text-muted-foreground">Auto-approved by AI. Review and revoke if needed.</p>
          </CardHeader>
          <CardContent className="pt-0 space-y-2">
            {aiApprovedIntakes.map((intake) => {
              const aiService = intake.service as { short_name?: string; type?: string } | undefined
              return (
                <div
                  key={intake.id}
                  className="flex items-center justify-between gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer"
                  onClick={() => openReviewPanel(intake.id)}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <UserCard
                      name={intake.patient.full_name}
                      size="sm"
                      className="shrink-0"
                    />
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="text-xs">
                        {aiService?.short_name || "Med Cert"}
                      </Badge>
                      <Badge className="bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-400 border-violet-200 dark:border-violet-500/20">
                        <Sparkles className="w-3 h-3 mr-1" />
                        AI approved
                      </Badge>
                      {Boolean((intake as Record<string, unknown>).soft_flags) && (
                        <Badge variant="outline" className="text-xs border-amber-300 dark:border-amber-500/30 text-amber-700 dark:text-amber-400">
                          Flagged for review
                        </Badge>
                      )}
                      {intake.ai_approved_at && (
                        <span className="text-xs text-muted-foreground">
                          {new Date(intake.ai_approved_at).toLocaleDateString("en-AU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs shrink-0"
                      onClick={(e) => {
                        e.stopPropagation()
                        openReviewPanel(intake.id)
                      }}
                    >
                      Review
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs text-destructive hover:text-destructive shrink-0"
                      onClick={(e) => {
                        e.stopPropagation()
                        setRevokeDialog(intake.id)
                      }}
                    >
                      Revoke
                    </Button>
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}

      {/* Pagination */}
      {pagination && totalPages > 1 && (
        <div className="flex items-center justify-between py-5 px-2 border-t">
          <div className="text-sm text-muted-foreground">
            {(currentPage - 1) * pagination.pageSize + 1} – {Math.min(currentPage * pagination.pageSize, pagination.total)} of {pagination.total}
          </div>
          <Pagination
            total={totalPages}
            page={currentPage}
            onChange={(page) => {
              const params = new URLSearchParams(window.location.search)
              params.set("page", String(page))
              router.push(`/doctor/dashboard?${params.toString()}`)
            }}
            showControls
            size="sm"
          />
        </div>
      )}

      {/* Revoke AI Approval Dialog */}
      <Dialog open={!!revokeDialog} onOpenChange={() => {
        setRevokeDialog(null)
        setRevokeReason("")
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revoke AI-Approved Certificate</DialogTitle>
            <DialogDescription>
              This will invalidate the certificate and move the request back to the review queue. The patient will be notified.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Reason for revocation</label>
              <Textarea
                value={revokeReason}
                onChange={(e) => setRevokeReason(e.target.value)}
                placeholder="Explain why this certificate should be revoked..."
                className="min-h-[80px] resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setRevokeDialog(null); setRevokeReason("") }}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={revokeReason.trim().length < 5 || isPending}
              onClick={() => {
                if (!revokeDialog) return
                startTransition(async () => {
                  const result = await revokeAIApproval(revokeDialog, revokeReason.trim())
                  if (result.success) {
                    toast.success("Certificate revoked. Request moved back to queue.")
                    setRevokeDialog(null)
                    setRevokeReason("")
                    router.refresh()
                  } else {
                    toast.error(result.error || "Failed to revoke certificate")
                  }
                })
              }}
            >
              {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Revoke Certificate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
          <div className="space-y-5">
            <div>
              <label className="text-sm font-medium mb-2.5 block">Reason</label>
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
