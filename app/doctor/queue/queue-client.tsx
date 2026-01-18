"use client"

import { useState, useEffect, useTransition, useMemo, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
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
} from "lucide-react"
import { updateStatusAction, saveDoctorNotesAction, declineIntakeAction, flagForFollowupAction, getDeclineReasonTemplatesAction } from "./actions"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { QueueClientProps } from "./types"
import { formatServiceType } from "@/lib/format-intake"
import type { IntakeStatus } from "@/types/db"

export function QueueClient({
  intakes: initialIntakes,
  doctorId,
}: QueueClientProps) {
  const router = useRouter()
  const [intakes, setIntakes] = useState(initialIntakes)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [isPending, startTransition] = useTransition()
  const [declineDialog, setDeclineDialog] = useState<string | null>(null)
  const [declineReasonCode, setDeclineReasonCode] = useState("")
  const [declineReasonNote, setDeclineReasonNote] = useState("")
  const [declineTemplates, setDeclineTemplates] = useState<Array<{ code: string; label: string; description: string | null; requires_note: boolean }>>([])
  const [flagDialog, setFlagDialog] = useState<string | null>(null)
  const [flagReason, setFlagReason] = useState("")
  const [doctorNotes, setDoctorNotes] = useState<Record<string, string>>({})
  const [sortOption, setSortOption] = useState<"flagged" | "wait" | "service">("flagged")
  const [filterService, setFilterService] = useState<string>("all")
  const [patientHistory, setPatientHistory] = useState<Record<string, { intakes: Array<{ id: string; status: string; created_at: string; service_type: string }> }>>({})
  const [loadingHistory, setLoadingHistory] = useState<Record<string, boolean>>({})

  // Real-time subscription for intakes
  useEffect(() => {
    const supabase = createClient()

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
          if (payload.eventType === "INSERT") {
            router.refresh()
          } else if (payload.eventType === "UPDATE") {
            setIntakes((prev) => prev.map((r) => (r.id === payload.new.id ? { ...r, ...payload.new } : r)))
          } else if (payload.eventType === "DELETE") {
            setIntakes((prev) => prev.filter((r) => r.id !== payload.old.id))
          }
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
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

  const getWaitTimeSeverity = (createdAt: string) => {
    const created = new Date(createdAt)
    const now = new Date()
    const diffMins = Math.floor((now.getTime() - created.getTime()) / (1000 * 60))

    if (diffMins > 60) return "critical"
    if (diffMins > 30) return "warning"
    return "normal"
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

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
  }

  const handleApprove = async (intakeId: string, serviceType?: string | null) => {
    startTransition(async () => {
      // For prescriptions, set status to awaiting_script (external Parchment entry needed)
      const newStatus: IntakeStatus = serviceType === "common_scripts" ? "awaiting_script" : "approved"
      const result = await updateStatusAction(intakeId, newStatus, doctorId)
      if (result.success) {
        setIntakes((prev) => prev.filter((r) => r.id !== intakeId))
        // For med certs, go to document builder; for scripts, go to intake detail
        if (serviceType === "common_scripts") {
          router.push(`/doctor/intakes/${intakeId}`)
        } else {
          router.push(`/doctor/intakes/${intakeId}/document`)
        }
      }
    })
  }

  // Fetch decline templates on mount
  useEffect(() => {
    getDeclineReasonTemplatesAction().then((result) => {
      if (result.success && result.templates) {
        setDeclineTemplates(result.templates)
      }
    })
  }, [])

  const selectedTemplate = declineTemplates.find(t => t.code === declineReasonCode)
  const requiresNote = selectedTemplate?.requires_note || declineReasonCode === "other"

  // Pre-populate decline note when template is selected
  const handleDeclineTemplateChange = (code: string) => {
    setDeclineReasonCode(code)
    const template = declineTemplates.find(t => t.code === code)
    if (template?.description && !declineReasonNote) {
      setDeclineReasonNote(template.description)
    }
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
        .select('id, status, created_at, service:services(type, short_name)')
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
              service_type: (d.service as { type?: string; short_name?: string })?.short_name || (d.service as { type?: string })?.type || 'Request'
            }))
          }
        }))
      }
    } catch (_error) {
      // Silent fail - patient history is supplementary information
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
        case "flagged":
          // Flagged cases first
          const aFlagged = hasRedFlags(a)
          const bFlagged = hasRedFlags(b)
          if (aFlagged && !bFlagged) return -1
          if (!aFlagged && bFlagged) return 1
          // Then by wait time
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        
        case "wait":
          // Longest wait first
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        
        case "service":
          // Group by service type
          const aService = (a.service as { type?: string })?.type || ""
          const bService = (b.service as { type?: string })?.type || ""
          if (aService !== bService) return aService.localeCompare(bService)
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        
        default:
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      }
    })
  }, [intakes, sortOption, hasRedFlags])

  const filteredIntakes = sortedIntakes.filter((r) => {
    // Filter by service type first
    if (filterService !== "all") {
      const service = r.service as { type?: string } | undefined
      if (service?.type !== filterService) return false
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Review Queue</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {filteredIntakes.length} case{filteredIntakes.length !== 1 ? "s" : ""} waiting • Priority first
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search patients..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 w-64"
            />
          </div>
          <Button variant="outline" size="icon" onClick={() => router.refresh()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Flagged Cases Summary */}
      {flaggedCount > 0 && (
        <Card className="border-red-200 bg-red-50/50">
          <CardContent className="py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-red-700">
                <ShieldAlert className="h-5 w-5" />
                <span className="font-medium">
                  {flaggedCount} case{flaggedCount !== 1 ? "s" : ""} with clinical flags
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="text-red-700 border-red-300 hover:bg-red-100"
                onClick={() => setSortOption("flagged")}
              >
                Review flagged first
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sort & Filter Controls */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
          <Select value={sortOption} onValueChange={(v) => setSortOption(v as typeof sortOption)}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Sort by..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="flagged">Flagged first</SelectItem>
              <SelectItem value="wait">Longest wait</SelectItem>
              <SelectItem value="service">By service type</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={filterService} onValueChange={setFilterService}>
            <SelectTrigger className="w-[160px]">
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
      </div>

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
            const waitSeverity = getWaitTimeSeverity(intake.created_at)
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
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                          )}
                          <Avatar className="h-10 w-10 shrink-0">
                            <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                              {getInitials(intake.patient.full_name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium truncate">{intake.patient.full_name}</span>
                              <span className="text-sm text-muted-foreground">{patientAge}y</span>
                              <Badge variant="outline" className="text-xs">
                                {service?.short_name || formatServiceType(service?.type || "")}
                              </Badge>
                              {intake.is_priority && (
                                <Badge className="bg-amber-100 text-amber-700 border-amber-200 ml-2">
                                  <Zap className="w-3 h-3 mr-1" />
                                  Priority
                                </Badge>
                              )}
                              {hasRedFlags(intake) && (
                                <Badge className="bg-red-100 text-red-700 border-red-200">
                                  <ShieldAlert className="w-3 h-3 mr-1" />
                                  Clinical flag
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-xs text-muted-foreground">#{index + 1} in queue</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <div
                            className={`flex items-center gap-1.5 text-sm ${
                              waitSeverity === "critical"
                                ? "text-red-600"
                                : waitSeverity === "warning"
                                  ? "text-dawn-600"
                                  : "text-muted-foreground"
                            }`}
                          >
                            <Clock className="h-4 w-4" />
                            <span className="font-medium">{calculateWaitTime(intake.created_at)}</span>
                          </div>
                          {waitSeverity === "critical" && <AlertTriangle className="h-4 w-4 text-red-500" />}
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
                      <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                        <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                          <History className="h-4 w-4 text-muted-foreground" />
                          Patient History
                        </h4>
                        {loadingHistory[intake.patient_id] ? (
                          <p className="text-sm text-muted-foreground">Loading history...</p>
                        ) : patientHistory[intake.patient_id]?.intakes?.length > 0 ? (
                          <div className="space-y-2">
                            {patientHistory[intake.patient_id].intakes
                              .filter(h => h.id !== intake.id)
                              .slice(0, 5)
                              .map(historyItem => (
                                <div key={historyItem.id} className="flex items-center justify-between text-sm py-1.5 px-2 bg-white dark:bg-slate-700 rounded">
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
                          disabled={isPending}
                          className="bg-emerald-600 hover:bg-emerald-700"
                        >
                          <CheckCircle className="h-4 w-4 mr-1.5" />
                          {service?.type === "common_scripts" ? "Approve Script" : "Approve & Generate"}
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
