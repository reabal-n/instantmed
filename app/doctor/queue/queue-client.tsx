"use client"

import { useState, useEffect, useTransition, useMemo, useCallback, useRef, useId } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { UserCard, Skeleton, Tooltip, Pagination } from "@/components/uix"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Checkbox } from "@/components/ui/checkbox"
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
  CreditCard,
  User,
  Calendar,
  MapPin,
  RefreshCw,
  Zap,
  History,
  Pill,
  Filter,
  ShieldAlert,
  ArrowUpDown,
  Focus,
  Maximize2,
  Sparkles,
  Volume2,
  VolumeX,
  Loader2,
} from "lucide-react"
import { updateStatusAction, saveDoctorNotesAction, declineIntakeAction, flagForFollowupAction, getDeclineReasonTemplatesAction } from "./actions"
import { getInfoRequestTemplatesAction, requestMoreInfoAction } from "@/app/actions/request-more-info"
import { generateMedCertPdfAndApproveAction } from "@/app/doctor/intakes/[id]/document/actions"
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
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts"

export function QueueClient({
  intakes: initialIntakes,
  doctorId,
  identityComplete = true,
  pagination,
}: QueueClientProps) {
  const router = useRouter()
  const [intakes, setIntakes] = useState(initialIntakes)

  // Calculate pagination info
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
  const [doctorNotes, setDoctorNotes] = useState<Record<string, string>>({})
  const [sortOption, setSortOption] = useState<"sla" | "flagged" | "wait" | "service">("sla")
  const [filterService, setFilterService] = useState<string>("all")
  const [filterStatus, setFilterStatus] = useState<string>("all")
  const [patientHistory, setPatientHistory] = useState<Record<string, { intakes: Array<{ id: string; status: string; created_at: string; service_type: string }> }>>({})
  const [loadingHistory, setLoadingHistory] = useState<Record<string, boolean>>({})
  const [focusMode, setFocusMode] = useState(false)
  const lastSyncTimeRef = useRef<Date>(new Date())
  const [isStale, setIsStale] = useState(false)
  const [isReconnecting, setIsReconnecting] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isBatchProcessing, setIsBatchProcessing] = useState(false)
  const [audioEnabled, setAudioEnabled] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("queue-audio-notifications") === "true"
    }
    return false
  })
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const audioEnabledRef = useRef(audioEnabled)
  const listId = useId()

  // Keep ref in sync with state
  useEffect(() => {
    audioEnabledRef.current = audioEnabled
  }, [audioEnabled])

  // Initialize audio element
  useEffect(() => {
    audioRef.current = new Audio("/sounds/notification.mp3")
    audioRef.current.volume = 0.5
  }, [])

  // Toggle audio notifications
  const toggleAudio = useCallback(() => {
    setAudioEnabled(prev => {
      const newValue = !prev
      localStorage.setItem("queue-audio-notifications", String(newValue))
      if (newValue && audioRef.current) {
        // Play a test sound when enabling
        audioRef.current.play().catch(() => {
          toast.error("Enable audio in browser settings to hear notifications")
        })
      }
      return newValue
    })
  }, [])

  // Real-time subscription for intakes with stale data detection
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
          // Update last sync time on any message
          lastSyncTimeRef.current = new Date()
          setIsStale(false)
          
          if (payload.eventType === "INSERT") {
            // Play notification sound for new intakes
            if (audioEnabledRef.current && audioRef.current) {
              audioRef.current.play().catch(() => {})
            }
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

    if (diffHours > 0) {
      return `${diffHours}h ${diffMins % 60}m`
    }
    return `${diffMins}m`
  }

  const getWaitTimeSeverity = (createdAt: string, slaDeadline?: string | null) => {
    // Use SLA deadline if available for severity calculation
    if (slaDeadline) {
      const deadline = new Date(slaDeadline)
      const now = new Date()
      const diffMins = Math.floor((deadline.getTime() - now.getTime()) / (1000 * 60))
      
      if (diffMins < 0) return "critical" // Past SLA
      if (diffMins < 30) return "warning" // Within 30 mins of SLA
      return "normal"
    }
    
    // Fallback to wait time based severity
    const created = new Date(createdAt)
    const now = new Date()
    const diffMins = Math.floor((now.getTime() - created.getTime()) / (1000 * 60))

    if (diffMins > 60) return "critical"
    if (diffMins > 30) return "warning"
    return "normal"
  }

  // Calculate time until SLA deadline (countdown)
  const calculateSlaCountdown = (slaDeadline: string | null | undefined): string | null => {
    if (!slaDeadline) return null
    
    const deadline = new Date(slaDeadline)
    const now = new Date()
    const diffMs = deadline.getTime() - now.getTime()
    const diffMins = Math.floor(diffMs / (1000 * 60))
    
    if (diffMins < 0) {
      const overdueMins = Math.abs(diffMins)
      const overdueHours = Math.floor(overdueMins / 60)
      if (overdueHours > 0) {
        return `${overdueHours}h ${overdueMins % 60}m overdue`
      }
      return `${overdueMins}m overdue`
    }
    
    const hours = Math.floor(diffMins / 60)
    if (hours > 0) {
      return `${hours}h ${diffMins % 60}m left`
    }
    return `${diffMins}m left`
  }

  const calculateAge = (dob: string): number => {
    const birthDate = new Date(dob)
    const today = new Date()
    let age = today.getFullYear() - birthDate.getFullYear()
    const monthDiff = today.getMonth() - birthDate.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--
    }
    return age
  }


  const handleApprove = async (intakeId: string, serviceType?: string | null) => {
    // For med certs - 1-click approval: generate PDF + approve atomically
    if (serviceType === "med_certs") {
      startTransition(async () => {
        const result = await generateMedCertPdfAndApproveAction(intakeId, "")
        if (result.success) {
          setIntakes((prev) => prev.filter((r) => r.id !== intakeId))
          const emailNote = result.emailStatus === "sent"
            ? "Certificate approved and sent to patient."
            : "Certificate approved. Email will be sent shortly."
          toast.success(emailNote)
        } else {
          toast.error(result.error || "Failed to approve certificate")
        }
      })
      return
    }

    startTransition(async () => {
      // For prescriptions, set status to awaiting_script (external Parchment entry needed)
      // For other services, set to approved directly
      const newStatus: IntakeStatus = serviceType === "common_scripts" || serviceType === "repeat_rx"
        ? "awaiting_script"
        : "approved"
      const result = await updateStatusAction(intakeId, newStatus, doctorId)
      if (result.success) {
        setIntakes((prev) => prev.filter((r) => r.id !== intakeId))
        // Navigate to intake detail for scripts to mark as sent
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

  // Fetch decline and info templates on mount
  useEffect(() => {
    getDeclineReasonTemplatesAction().then((result) => {
      if (result.success && result.templates) {
        setDeclineTemplates(result.templates)
      }
    })
    getInfoRequestTemplatesAction().then((result) => {
      if (result.success && result.templates) {
        setInfoTemplates(result.templates)
      }
    })
  }, [])

  const selectedTemplate = declineTemplates.find(t => t.code === declineReasonCode)
  const requiresNote = selectedTemplate?.requires_note || declineReasonCode === "other"
  const selectedInfoTemplate = infoTemplates.find(t => t.code === infoTemplateCode)

  // Pre-populate decline note when template is selected
  const handleDeclineTemplateChange = (code: string) => {
    setDeclineReasonCode(code)
    const template = declineTemplates.find(t => t.code === code)
    if (template?.description && !declineReasonNote) {
      setDeclineReasonNote(template.description)
    }
  }

  // Pre-populate info message when template is selected
  const handleInfoTemplateChange = (code: string) => {
    setInfoTemplateCode(code)
    const template = infoTemplates.find(t => t.code === code)
    if (template?.message_template) {
      setInfoMessage(template.message_template)
    }
  }

  // Handle request more info
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

  // Check if intake has clinical red flags using built-in risk assessment
  const hasRedFlags = useCallback((intake: typeof intakes[0]): boolean => {
    // Check for flagged_for_followup
    if (intake.flagged_for_followup) return true
    
    // Check risk tier (high or critical)
    if (intake.risk_tier === "high" || intake.risk_tier === "critical") return true
    
    // Check if there are any risk flags
    if (intake.risk_flags && Array.isArray(intake.risk_flags) && intake.risk_flags.length > 0) return true
    
    // Check risk score threshold (>= 7 indicates clinical concern)
    if (intake.risk_score >= 7) return true
    
    // Check if live consult is required
    if (intake.requires_live_consult) return true
    
    return false
  }, [])

  // Count flagged cases
  const flaggedCount = useMemo(() => {
    return intakes.filter(hasRedFlags).length
  }, [intakes, hasRedFlags])

  // Get unique service types for filter
  const serviceTypes = useMemo(() => {
    const types = new Set<string>()
    intakes.forEach(intake => {
      const service = intake.service as { type?: string; short_name?: string } | undefined
      if (service?.type) types.add(service.type)
    })
    return Array.from(types)
  }, [intakes])

  // Batch selection helpers
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectAll = () => {
    const allIds = new Set(filteredIntakes.map(i => i.id))
    setSelectedIds(allIds)
  }

  const clearSelection = () => setSelectedIds(new Set())

  const handleBatchClaim = async () => {
    if (selectedIds.size === 0) return
    setIsBatchProcessing(true)
    let successCount = 0
    try {
      for (const id of selectedIds) {
        const result = await updateStatusAction(id, "in_review" as IntakeStatus, doctorId)
        if (result?.success) successCount++
      }
      toast.success(`Claimed ${successCount} of ${selectedIds.size} intakes`)
      clearSelection()
      router.refresh()
    } catch {
      toast.error("Failed to claim some intakes")
    } finally {
      setIsBatchProcessing(false)
    }
  }

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

  const handleSaveNotes = async (intakeId: string) => {
    const notes = doctorNotes[intakeId]
    if (!notes?.trim()) return

    startTransition(async () => {
      await saveDoctorNotesAction(intakeId, notes)
    })
  }

  // Fetch patient history when expanding an intake
  const fetchPatientHistory = async (patientId: string) => {
    if (patientHistory[patientId] || loadingHistory[patientId]) return
    
    setLoadingHistory(prev => ({ ...prev, [patientId]: true }))
    try {
      const supabase = createClient()
      const { data } = await supabase
        .from('intakes')
        .select('id, status, created_at, category')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false })
        .limit(10)
      
      if (data) {
        setPatientHistory(prev => ({
          ...prev,
          [patientId]: {
            intakes: data.map(d => ({
              id: d.id,
              status: d.status,
              created_at: d.created_at,
              service_type: d.category || 'Request'
            }))
          }
        }))
      }
    } catch {
      toast.error("Failed to load patient history")
    } finally {
      setLoadingHistory(prev => ({ ...prev, [patientId]: false }))
    }
  }

  // Sort intakes based on selected sort option
  const sortedIntakes = useMemo(() => {
    return [...intakes].sort((a, b) => {
      // Priority intakes always come first
      if (a.is_priority && !b.is_priority) return -1
      if (!a.is_priority && b.is_priority) return 1
      
      // Then apply selected sort
      switch (sortOption) {
        case "sla": {
          // SLA urgency: breached first, then approaching deadline, then by wait time
          const aSla = a.sla_deadline ? new Date(a.sla_deadline).getTime() : Infinity
          const bSla = b.sla_deadline ? new Date(b.sla_deadline).getTime() : Infinity
          // Flagged cases bubble up within SLA sort
          const aFlagged = hasRedFlags(a)
          const bFlagged = hasRedFlags(b)
          if (aFlagged && !bFlagged) return -1
          if (!aFlagged && bFlagged) return 1
          // Then sort by SLA deadline (earliest/breached first)
          if (aSla !== bSla) return aSla - bSla
          // Fallback: longest wait first
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        }

        case "flagged": {
          // Flagged cases first
          const aFlagged = hasRedFlags(a)
          const bFlagged = hasRedFlags(b)
          if (aFlagged && !bFlagged) return -1
          if (!aFlagged && bFlagged) return 1
          // Then by wait time
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        }

        case "wait":
          // Longest wait first
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()

        case "service": {
          // Group by service type
          const aService = (a.service as { type?: string })?.type || ""
          const bService = (b.service as { type?: string })?.type || ""
          if (aService !== bService) return aService.localeCompare(bService)
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        }

        default:
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      }
    })
  }, [intakes, sortOption, hasRedFlags])

  const filteredIntakes = sortedIntakes.filter((r) => {
    // Filter by service type
    if (filterService !== "all") {
      const service = r.service as { type?: string } | undefined
      if (service?.type !== filterService) return false
    }
    
    // Filter by status
    if (filterStatus !== "all") {
      if (r.status !== filterStatus) return false
    }
    
    // Then filter by search query
    if (!searchQuery.trim()) return true
    const query = searchQuery.toLowerCase()
    const service = r.service as { name?: string; type?: string } | undefined
    return (
      r.patient.full_name.toLowerCase().includes(query) ||
      r.patient.medicare_number?.includes(query) ||
      formatServiceType(service?.type || "").toLowerCase().includes(query)
    )
  })

  // Keyboard shortcuts for queue navigation
  const keyboardShortcuts = useMemo(() => [
    {
      key: "j",
      action: () => setSelectedIndex(prev => Math.min(prev + 1, filteredIntakes.length - 1)),
      description: "Next case",
    },
    {
      key: "k", 
      action: () => setSelectedIndex(prev => Math.max(prev - 1, 0)),
      description: "Previous case",
    },
    {
      key: "Enter",
      action: () => {
        const intake = filteredIntakes[selectedIndex]
        if (intake) router.push(`/doctor/intakes/${intake.id}`)
      },
      description: "View selected case",
    },
    {
      key: "a",
      action: () => {
        const intake = filteredIntakes[selectedIndex]
        if (intake) {
          const service = intake.service as { type?: string } | undefined
          handleApprove(intake.id, service?.type)
        }
      },
      description: "Approve selected case",
    },
    {
      key: "d",
      action: () => {
        const intake = filteredIntakes[selectedIndex]
        if (intake) setDeclineDialog(intake.id)
      },
      description: "Decline selected case",
    },
    {
      key: "?",
      shift: true,
      action: () => setShowShortcutsHelp(prev => !prev),
      description: "Toggle shortcuts help",
    },
    {
      key: "Escape",
      action: () => {
        setShowShortcutsHelp(false)
        setDeclineDialog(null)
        setFlagDialog(null)
      },
      description: "Close dialogs",
    },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [filteredIntakes.length, selectedIndex, router])

  useKeyboardShortcuts({
    shortcuts: keyboardShortcuts,
    enabled: !declineDialog && !flagDialog,
  })

  // Reset selected index when filtered list changes
  useEffect(() => {
    setSelectedIndex(0)
  }, [filterService, filterStatus, searchQuery])

  return (
    <div className="space-y-6">
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
            <p className="text-[12px] text-amber-700/80 dark:text-amber-300/80">
              Last synced: {lastSyncTimeRef.current.toLocaleTimeString()}
            </p>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => router.refresh()}
            className="shrink-0 h-7 text-[12px] border-amber-300 dark:border-amber-500/30 hover:bg-amber-100 dark:hover:bg-amber-500/10"
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Refresh
          </Button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col gap-3" data-testid="queue-header">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-foreground font-sans" data-testid="queue-heading">Review Queue</h2>
            <p className="text-[13px] text-muted-foreground mt-0.5">
              {filteredIntakes.length} case{filteredIntakes.length !== 1 ? "s" : ""} waiting
            </p>
          </div>
          {/* Desktop controls */}
          <div className="hidden md:flex items-center gap-2">
            {!focusMode && (
              <Input
                placeholder="Search patients..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-56 h-8 text-[13px]"
                startContent={<Search className="h-3.5 w-3.5 text-muted-foreground" />}
              />
            )}
            <Button
              variant={focusMode ? "default" : "outline"}
              size="sm"
              onClick={() => setFocusMode(!focusMode)}
              className={cn("h-8 text-[12px]", focusMode && "bg-primary hover:bg-primary/90 text-primary-foreground")}
              aria-label={focusMode ? "Exit focus mode" : "Enter focus mode"}
            >
              {focusMode ? (
                <><Maximize2 className="h-3.5 w-3.5 mr-1" />Exit Focus</>
              ) : (
                <><Focus className="h-3.5 w-3.5 mr-1" />Focus</>
              )}
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => router.refresh()}>
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
            <Button 
              variant={audioEnabled ? "default" : "ghost"}
              size="icon"
              className={cn("h-8 w-8", audioEnabled && "bg-emerald-600 hover:bg-emerald-700 text-white")}
              onClick={toggleAudio}
              title={audioEnabled ? "Disable sound notifications" : "Enable sound notifications"}
            >
              {audioEnabled ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 text-[12px] text-muted-foreground"
              onClick={() => setShowShortcutsHelp(prev => !prev)}
            >
              <kbd className="px-1 py-0.5 rounded bg-muted text-[10px] font-mono mr-1">?</kbd>
              Keys
            </Button>
          </div>
        </div>
        {/* Mobile controls */}
        <div className="flex md:hidden flex-col gap-2">
          {!focusMode && (
            <Input
              placeholder="Search patients..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-8 text-[13px]"
              startContent={<Search className="h-3.5 w-3.5 text-muted-foreground" />}
            />
          )}
          <div className="flex items-center gap-1.5 flex-wrap">
            <Button
              variant={focusMode ? "default" : "outline"}
              size="sm"
              onClick={() => setFocusMode(!focusMode)}
              className={cn("h-8 text-[12px] flex-1 sm:flex-none", focusMode && "bg-primary hover:bg-primary/90 text-primary-foreground")}
              aria-label={focusMode ? "Exit focus mode" : "Enter focus mode"}
            >
              {focusMode ? <Maximize2 className="h-3.5 w-3.5 mr-1" /> : <Focus className="h-3.5 w-3.5 mr-1" />}
              {focusMode ? "Exit" : "Focus"}
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => router.refresh()}>
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
            <Button 
              variant={audioEnabled ? "default" : "ghost"}
              size="icon"
              className={cn("h-8 w-8", audioEnabled && "bg-emerald-600 hover:bg-emerald-700 text-white")}
              onClick={toggleAudio}
            >
              {audioEnabled ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Keyboard Shortcuts */}
      {showShortcutsHelp && (
        <Card className="border-border/50">
          <CardContent className="py-3">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-[13px] font-medium">Keyboard Shortcuts</h3>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-muted-foreground" onClick={() => setShowShortcutsHelp(false)}>
                <span className="sr-only">Close</span>
                <span aria-hidden>{"x"}</span>
              </Button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2" id={listId}>
              {keyboardShortcuts.slice(0, -1).map((s, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <kbd className="px-1.5 py-0.5 rounded bg-muted font-mono text-[10px] text-muted-foreground">
                    {s.shift && "⇧"}{s.key === "Enter" ? "↵" : s.key.toUpperCase()}
                  </kbd>
                  <span className="text-[12px] text-muted-foreground">{s.description}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Flagged Cases */}
      {!focusMode && flaggedCount > 0 && (
        <div className="flex items-center justify-between p-3 rounded-lg bg-destructive/5 border border-destructive/15">
          <div className="flex items-center gap-2 text-destructive">
            <ShieldAlert className="h-4 w-4" />
            <span className="text-[13px] font-medium">
              {flaggedCount} case{flaggedCount !== 1 ? "s" : ""} with clinical flags
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-[12px] text-destructive hover:bg-destructive/10"
            onClick={() => setSortOption("flagged")}
          >
            Review flagged first
          </Button>
        </div>
      )}

      {/* Sort & Filter */}
      {!focusMode && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:flex lg:items-center gap-2">
          <div className="flex items-center gap-2">
            <ArrowUpDown className="h-4 w-4 text-muted-foreground hidden sm:block" />
            <Select value={sortOption} onValueChange={(v) => setSortOption(v as typeof sortOption)}>
              <SelectTrigger className="w-full lg:w-[160px]">
                <SelectValue placeholder="Sort by..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sla">SLA Urgency</SelectItem>
                <SelectItem value="flagged">Flagged first</SelectItem>
                <SelectItem value="wait">Longest wait</SelectItem>
                <SelectItem value="service">By service type</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground hidden sm:block" />
            <Select value={filterService} onValueChange={setFilterService}>
              <SelectTrigger className="w-full lg:w-[160px]">
                <SelectValue placeholder="Filter service..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All services</SelectItem>
                {serviceTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {formatServiceType(type)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2 col-span-2 sm:col-span-1">
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full lg:w-[140px]">
                <SelectValue placeholder="Filter status..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="paid">New (Paid)</SelectItem>
                <SelectItem value="in_review">In Review</SelectItem>
                <SelectItem value="pending_info">Pending Info</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* Batch Actions Bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
          <span className="text-sm font-medium">{selectedIds.size} selected</span>
          <Button size="sm" variant="outline" onClick={handleBatchClaim} disabled={isBatchProcessing}>
            {isBatchProcessing ? <RefreshCw className="h-3 w-3 mr-1 animate-spin" /> : <Zap className="h-3 w-3 mr-1" />}
            Claim All
          </Button>
          <Button size="sm" variant="ghost" onClick={clearSelection}>Clear</Button>
          <div className="ml-auto">
            <Button size="sm" variant="ghost" onClick={selectAll}>Select All</Button>
          </div>
        </div>
      )}

      {/* Queue List */}
      <div className="space-y-3">
        {filteredIntakes.length === 0 ? (
          <Card className="py-12">
            <CardContent className="text-center text-muted-foreground">
              <CheckCircle className="h-12 w-12 mx-auto mb-4 text-emerald-500" />
              <p className="font-medium">Queue is clear!</p>
              <p className="text-sm">No pending cases at the moment.</p>
            </CardContent>
          </Card>
        ) : (
          filteredIntakes.map((intake, index) => {
            const isExpanded = expandedId === intake.id
            const waitSeverity = getWaitTimeSeverity(intake.created_at, intake.sla_deadline)
            const patientAge = calculateAge(intake.patient.date_of_birth)
            const service = intake.service as { name?: string; type?: string; short_name?: string } | undefined

            return (
              <Collapsible
                key={intake.id}
                open={isExpanded}
                onOpenChange={() => setExpandedId(isExpanded ? null : intake.id)}
              >
                <Card className={`transition-all ${isExpanded ? "ring-2 ring-primary/20" : ""}`}>
                  <CollapsibleTrigger asChild onClick={() => fetchPatientHistory(intake.patient_id)}>
                    <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors py-4">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 min-w-0">
                          <Checkbox
                            checked={selectedIds.has(intake.id)}
                            onCheckedChange={() => toggleSelect(intake.id)}
                            onClick={(e) => e.stopPropagation()}
                            className="shrink-0"
                          />
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                          )}
                          <UserCard
                            name={intake.patient.full_name}
                            description={`${patientAge}y`}
                            size="sm"
                            className="shrink-0"
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge variant="outline" className="text-xs">
                                {service?.short_name || formatServiceType(service?.type || "")}
                              </Badge>
                              {intake.is_priority && (
                                <Badge className="bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700 ml-2">
                                  <Zap className="w-3 h-3 mr-1" />
                                  Priority
                                </Badge>
                              )}
                              {hasRedFlags(intake) && (
                                <Badge className="bg-destructive/10 text-destructive border-destructive/20 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800">
                                  <ShieldAlert className="w-3 h-3 mr-1" />
                                  Clinical flag
                                </Badge>
                              )}
                              {(intake as unknown as { ai_draft_status?: string }).ai_draft_status === "completed" && (
                                <Badge className="bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-900/30 dark:text-violet-300 dark:border-violet-700">
                                  <Sparkles className="w-3 h-3 mr-1" />
                                  AI draft ready
                                </Badge>
                              )}
                            </div>
                            {/* P2 DOCTOR_WORKLOAD_AUDIT: Queue preview - show key info without expanding */}
                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                              <span className="text-xs text-muted-foreground">#{index + 1} in queue</span>
                              {(() => {
                                const answers = (intake as unknown as { answers?: { symptoms?: string; duration?: string; medication_name?: string } }).answers
                                if (!answers) return null
                                return (
                                  <>
                                    {answers.symptoms && (
                                      <>
                                        <span className="text-xs text-muted-foreground">•</span>
                                        {String(answers.symptoms).length > 50 ? (
                                          <Tooltip content={String(answers.symptoms)}>
                                            <span className="text-xs text-muted-foreground truncate max-w-[200px] cursor-help">
                                              {String(answers.symptoms).substring(0, 50)}...
                                            </span>
                                          </Tooltip>
                                        ) : (
                                          <span className="text-xs text-muted-foreground">
                                            {String(answers.symptoms)}
                                          </span>
                                        )}
                                      </>
                                    )}
                                    {answers.duration && (
                                      <>
                                        <span className="text-xs text-muted-foreground">•</span>
                                        <Badge variant="outline" className="text-[10px] h-4 px-1">
                                          {answers.duration}d
                                        </Badge>
                                      </>
                                    )}
                                    {answers.medication_name && (
                                      <>
                                        <span className="text-xs text-muted-foreground">•</span>
                                        <span className="text-xs font-medium truncate max-w-[150px]">
                                          {String(answers.medication_name)}
                                        </span>
                                      </>
                                    )}
                                  </>
                                )
                              })()}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          {/* SLA Countdown - Primary metric */}
                          {intake.sla_deadline && (
                            <div
                              className={`flex items-center gap-1.5 text-sm font-medium ${
                                waitSeverity === "critical"
                                  ? "text-destructive"
                                  : waitSeverity === "warning"
                                    ? "text-amber-600 dark:text-amber-400"
                                    : "text-emerald-600 dark:text-emerald-400"
                              }`}
                            >
                              <Clock className="h-4 w-4" />
                              <span>{calculateSlaCountdown(intake.sla_deadline)}</span>
                            </div>
                          )}
                          {/* Wait time - Secondary if no SLA */}
                          {!intake.sla_deadline && (
                            <div
                              className={`flex items-center gap-1.5 text-sm ${
                                waitSeverity === "critical"
                                  ? "text-destructive"
                                  : waitSeverity === "warning"
                                    ? "text-amber-600 dark:text-amber-400"
                                    : "text-muted-foreground"
                              }`}
                            >
                              <Clock className="h-4 w-4" />
                              <span className="font-medium">{calculateWaitTime(intake.created_at)}</span>
                            </div>
                          )}
                          {/* Icons for colorblind accessibility - not just color */}
                          {waitSeverity === "critical" && (
                            <AlertTriangle className="h-4 w-4 text-destructive" aria-label="Critical urgency" />
                          )}
                          {waitSeverity === "warning" && (
                            <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400 animate-pulse" aria-label="Approaching deadline" />
                          )}
                        </div>
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <CardContent className="pt-0 pb-4 space-y-4">
                      {/* Patient Details */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-xs text-muted-foreground">Patient</p>
                            <p className="text-sm font-medium">{intake.patient.full_name}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-xs text-muted-foreground">DOB</p>
                            <p className="text-sm font-medium">
                              {new Date(intake.patient.date_of_birth).toLocaleDateString("en-AU")}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <CreditCard className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-xs text-muted-foreground">Medicare</p>
                            <p className="text-sm font-medium font-mono">
                              {intake.patient.medicare_number?.slice(0, 4) || "N/A"} ••••
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-xs text-muted-foreground">Location</p>
                            <p className="text-sm font-medium">
                              {intake.patient.suburb || "N/A"}, {intake.patient.state || ""}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* View Details Link */}
                      <div>
                        <Link 
                          href={`/doctor/intakes/${intake.id}`}
                          className="inline-flex items-center text-sm text-primary hover:underline"
                        >
                          <FileText className="h-3.5 w-3.5 mr-1" />
                          View full details & questionnaire responses
                        </Link>
                      </div>

                      {/* Patient History */}
                      <div className="p-4 bg-muted rounded-lg">
                        <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                          <History className="h-4 w-4 text-muted-foreground" />
                          Patient History
                        </h4>
                        {loadingHistory[intake.patient_id] ? (
                          <div className="space-y-2">
                            <Skeleton className="h-8 w-full rounded" />
                            <Skeleton className="h-8 w-3/4 rounded" />
                          </div>
                        ) : patientHistory[intake.patient_id]?.intakes?.length > 0 ? (
                          <div className="space-y-2">
                            {patientHistory[intake.patient_id].intakes
                              .filter(h => h.id !== intake.id)
                              .slice(0, 5)
                              .map(historyItem => (
                                <div key={historyItem.id} className="flex items-center justify-between text-sm py-1.5 px-2 bg-card rounded">
                                  <div className="flex items-center gap-2">
                                    {historyItem.service_type.includes('script') ? (
                                      <Pill className="h-3.5 w-3.5 text-muted-foreground" />
                                    ) : (
                                      <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                                    )}
                                    <span>{historyItem.service_type}</span>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <Badge variant={historyItem.status === 'approved' || historyItem.status === 'completed' ? 'default' : 'secondary'} className="text-xs">
                                      {historyItem.status}
                                    </Badge>
                                    <span className="text-xs text-muted-foreground">
                                      {new Date(historyItem.created_at).toLocaleDateString('en-AU', { month: 'short', day: 'numeric' })}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            {patientHistory[intake.patient_id].intakes.filter(h => h.id !== intake.id).length === 0 && (
                              <p className="text-sm text-muted-foreground">First request from this patient</p>
                            )}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">First request from this patient</p>
                        )}
                      </div>

                      {/* Doctor Notes */}
                      <div>
                        <h4 className="text-sm font-medium mb-2">Private Notes</h4>
                        <div className="flex gap-2">
                          <Textarea
                            placeholder="Add clinical notes (private, not shared with patient)..."
                            value={doctorNotes[intake.id] || ""}
                            onChange={(e) =>
                              setDoctorNotes((prev) => ({
                                ...prev,
                                [intake.id]: e.target.value,
                              }))
                            }
                            className="min-h-20 text-sm"
                          />
                        </div>
                        {doctorNotes[intake.id] && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="mt-2"
                            onClick={() => handleSaveNotes(intake.id)}
                            disabled={isPending}
                          >
                            Save notes
                          </Button>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex flex-wrap items-center gap-2 pt-2 border-t">
                        <Button
                          onClick={() => handleApprove(intake.id, service?.type)}
                          disabled={isPending || !identityComplete}
                          className="bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-700 dark:hover:bg-emerald-600 disabled:opacity-50"
                          title={!identityComplete ? "Complete your Certificate Identity in Settings first" : undefined}
                        >
                          {isPending ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-1.5" />}
                          {isPending && service?.type === "med_certs" ? "Generating..." : service?.type === "common_scripts" ? "Approve Script" : "Approve & Send"}
                        </Button>
                        <Button variant="destructive" onClick={() => setDeclineDialog(intake.id)} disabled={isPending}>
                          <XCircle className="h-4 w-4 mr-1.5" />
                          Decline
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline">
                              <MoreVertical className="h-4 w-4 mr-1.5" />
                              More
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
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            )
          })
        )}
      </div>

      {/* Pagination */}
      {pagination && totalPages > 1 && (
        <div className="flex items-center justify-between py-4 px-2 border-t">
          <div className="text-sm text-muted-foreground">
            Showing {(currentPage - 1) * pagination.pageSize + 1} - {Math.min(currentPage * pagination.pageSize, pagination.total)} of {pagination.total} requests
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
              Select a reason for declining. The patient will be notified by email.
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
              {selectedTemplate?.description && (
                <p className="text-xs text-muted-foreground mt-1">{selectedTemplate.description}</p>
              )}
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">
                Note for patient {requiresNote ? "(required)" : "(optional)"}
              </label>
              <Textarea
                placeholder="Provide additional details for the patient..."
                value={declineReasonNote}
                onChange={(e) => setDeclineReasonNote(e.target.value)}
                className="min-h-[100px]"
              />
              {selectedTemplate?.description && declineReasonNote === selectedTemplate.description && (
                <p className="text-xs text-muted-foreground mt-1">Template pre-filled. Edit as needed.</p>
              )}
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
              Decline & Notify Patient
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
              Select what information you need. The patient will be notified by email.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Information needed</label>
              <Select value={infoTemplateCode} onValueChange={handleInfoTemplateChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select what you need..." />
                </SelectTrigger>
                <SelectContent>
                  {infoTemplates.map((template) => (
                    <SelectItem key={template.code} value={template.code}>
                      {template.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedInfoTemplate?.description && (
                <p className="text-xs text-muted-foreground mt-1">{selectedInfoTemplate.description}</p>
              )}
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Message to patient</label>
              <Textarea
                placeholder="Explain what information you need..."
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
