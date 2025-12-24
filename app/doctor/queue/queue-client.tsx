"use client"

import { useState, useEffect, useTransition, useMemo } from "react"
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Clock,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Phone,
  Flag,
  ArrowUpCircle,
  FileText,
  Search,
  MoreVertical,
  CreditCard,
  User,
  Calendar,
  MapPin,
  RefreshCw,
  Zap,
} from "lucide-react"
import { updateStatusAction, saveDoctorNotesAction, escalateRequestAction, flagForFollowupAction } from "./actions"
import type { QueueClientProps } from "./types"
import { formatCategory, formatSubtype } from "@/lib/format-utils"

export function QueueClient({
  requests: initialRequests,
  doctorId,
}: QueueClientProps) {
  const router = useRouter()
  const [requests, setRequests] = useState(initialRequests)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [isPending, startTransition] = useTransition()
  const [escalateDialog, setEscalateDialog] = useState<{
    requestId: string
    type: "senior_review" | "phone_consult"
  } | null>(null)
  const [escalateReason, setEscalateReason] = useState("")
  const [flagDialog, setFlagDialog] = useState<string | null>(null)
  const [flagReason, setFlagReason] = useState("")
  const [doctorNotes, setDoctorNotes] = useState<Record<string, string>>({})

  // Real-time subscription
  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel("queue-updates")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "requests",
          filter: "status=eq.pending",
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            router.refresh()
          } else if (payload.eventType === "UPDATE") {
            setRequests((prev) => prev.map((r) => (r.id === payload.new.id ? { ...r, ...payload.new } : r)))
          } else if (payload.eventType === "DELETE") {
            setRequests((prev) => prev.filter((r) => r.id !== payload.old.id))
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

  const handleApprove = async (requestId: string) => {
    startTransition(async () => {
      const result = await updateStatusAction(requestId, "approved", doctorId)
      if (result.success) {
        setRequests((prev) => prev.filter((r) => r.id !== requestId))
        router.push(`/doctor/requests/${requestId}/document`)
      }
    })
  }

  const handleDecline = async (requestId: string) => {
    startTransition(async () => {
      const result = await updateStatusAction(requestId, "declined", doctorId)
      if (result.success) {
        setRequests((prev) => prev.filter((r) => r.id !== requestId))
      }
    })
  }

  const handleEscalate = async () => {
    if (!escalateDialog || !escalateReason.trim()) return

    startTransition(async () => {
      const result = await escalateRequestAction(
        escalateDialog.requestId,
        escalateDialog.type,
        escalateReason,
        doctorId,
      )
      if (result.success) {
        setRequests((prev) => prev.filter((r) => r.id !== escalateDialog.requestId))
        setEscalateDialog(null)
        setEscalateReason("")
      }
    })
  }

  const handleFlag = async () => {
    if (!flagDialog || !flagReason.trim()) return

    startTransition(async () => {
      const result = await flagForFollowupAction(flagDialog, flagReason)
      if (result.success) {
        setRequests((prev) => prev.map((r) => (r.id === flagDialog ? { ...r, flagged_for_followup: true } : r)))
        setFlagDialog(null)
        setFlagReason("")
      }
    })
  }

  const handleSaveNotes = async (requestId: string) => {
    const notes = doctorNotes[requestId]
    if (!notes?.trim()) return

    startTransition(async () => {
      await saveDoctorNotesAction(requestId, notes)
    })
  }

  // Sort requests: priority first, then by created_at (oldest first)
  const sortedRequests = useMemo(() => {
    return [...requests].sort((a, b) => {
      // Priority requests come first
      if (a.priority_review && !b.priority_review) return -1
      if (!a.priority_review && b.priority_review) return 1
      // Then sort by created_at (oldest first)
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    })
  }, [requests])

  const filteredRequests = sortedRequests.filter((r) => {
    if (!searchQuery.trim()) return true
    const query = searchQuery.toLowerCase()
    return (
      r.patient.full_name.toLowerCase().includes(query) ||
      r.patient.medicare_number?.includes(query) ||
      formatCategory(r.category).toLowerCase().includes(query)
    )
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Review Queue</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {filteredRequests.length} request{filteredRequests.length !== 1 ? "s" : ""} waiting • Oldest first
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

      {/* Queue List */}
      <div className="space-y-3">
        {filteredRequests.length === 0 ? (
          <Card className="py-12">
            <CardContent className="text-center text-muted-foreground">
              <CheckCircle className="h-12 w-12 mx-auto mb-4 text-emerald-500" />
              <p className="font-medium">Queue is clear!</p>
              <p className="text-sm">No pending requests at the moment.</p>
            </CardContent>
          </Card>
        ) : (
          filteredRequests.map((request, index) => {
            const isExpanded = expandedId === request.id
            const waitSeverity = getWaitTimeSeverity(request.created_at)
            const patientAge = calculateAge(request.patient.date_of_birth)

            return (
              <Collapsible
                key={request.id}
                open={isExpanded}
                onOpenChange={() => setExpandedId(isExpanded ? null : request.id)}
              >
                <Card className={`transition-all ${isExpanded ? "ring-2 ring-primary/20" : ""}`}>
                  <CollapsibleTrigger asChild>
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
                              {getInitials(request.patient.full_name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium truncate">{request.patient.full_name}</span>
                              <span className="text-sm text-muted-foreground">{patientAge}y</span>
                              <Badge variant="outline" className="text-xs">
                                {formatCategory(request.category)}
                              </Badge>
                              {request.subtype && (
                                <Badge variant="secondary" className="text-xs">
                                  {formatSubtype(request.subtype)}
                                </Badge>
                              )}
                              {request.priority_review && (
                                <Badge className="bg-amber-100 text-amber-700 border-amber-200 ml-2">
                                  <Zap className="w-3 h-3 mr-1" />
                                  Priority
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
                                  ? "text-amber-600"
                                  : "text-muted-foreground"
                            }`}
                          >
                            <Clock className="h-4 w-4" />
                            <span className="font-medium">{calculateWaitTime(request.created_at)}</span>
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
                            <p className="text-sm font-medium">{request.patient.full_name}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-xs text-muted-foreground">DOB</p>
                            <p className="text-sm font-medium">
                              {new Date(request.patient.date_of_birth).toLocaleDateString("en-AU")}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <CreditCard className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-xs text-muted-foreground">Medicare</p>
                            <p className="text-sm font-medium font-mono">
                              {request.patient.medicare_number?.slice(0, 4) || "N/A"} ••••
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-xs text-muted-foreground">Location</p>
                            <p className="text-sm font-medium">
                              {request.patient.suburb || "N/A"}, {request.patient.state || ""}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Questionnaire Responses */}
                      <div>
                        <h4 className="text-sm font-medium mb-2">Questionnaire Responses</h4>
                        <div className="p-4 bg-muted/30 rounded-lg text-sm space-y-2">
                          {request.clinical_note ? (
                            <p>{request.clinical_note}</p>
                          ) : (
                            <p className="text-muted-foreground italic">
                              No questionnaire responses available. View full details to see answers.
                            </p>
                          )}
                          <Link 
                            href={`/doctor/requests/${request.id}`}
                            className="inline-flex items-center text-sm text-primary hover:underline"
                          >
                            <FileText className="h-3.5 w-3.5 mr-1" />
                            View full details
                          </Link>
                        </div>
                      </div>

                      {/* Doctor Notes */}
                      <div>
                        <h4 className="text-sm font-medium mb-2">Private Notes</h4>
                        <div className="flex gap-2">
                          <Textarea
                            placeholder="Add clinical notes (private, not shared with patient)..."
                            value={doctorNotes[request.id] || ""}
                            onChange={(e) =>
                              setDoctorNotes((prev) => ({
                                ...prev,
                                [request.id]: e.target.value,
                              }))
                            }
                            className="min-h-[80px] text-sm"
                          />
                        </div>
                        {doctorNotes[request.id] && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="mt-2"
                            onClick={() => handleSaveNotes(request.id)}
                            disabled={isPending}
                          >
                            Save notes
                          </Button>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex flex-wrap items-center gap-2 pt-2 border-t">
                        <Button
                          onClick={() => handleApprove(request.id)}
                          disabled={isPending}
                          className="bg-emerald-600 hover:bg-emerald-700"
                        >
                          <CheckCircle className="h-4 w-4 mr-1.5" />
                          Approve & Generate
                        </Button>
                        <Button variant="destructive" onClick={() => handleDecline(request.id)} disabled={isPending}>
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
                            <DropdownMenuItem onClick={() => setFlagDialog(request.id)}>
                              <Flag className="h-4 w-4 mr-2" />
                              Flag for follow-up
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() =>
                                setEscalateDialog({
                                  requestId: request.id,
                                  type: "senior_review",
                                })
                              }
                            >
                              <ArrowUpCircle className="h-4 w-4 mr-2" />
                              Escalate to senior
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                setEscalateDialog({
                                  requestId: request.id,
                                  type: "phone_consult",
                                })
                              }
                            >
                              <Phone className="h-4 w-4 mr-2" />
                              Needs phone consult
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

      {/* Escalate Dialog */}
      <Dialog open={!!escalateDialog} onOpenChange={() => setEscalateDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {escalateDialog?.type === "senior_review" ? "Escalate to Senior Review" : "Mark for Phone Consult"}
            </DialogTitle>
            <DialogDescription>
              {escalateDialog?.type === "senior_review"
                ? "This request will be escalated to a senior doctor for review."
                : "This request will be marked as requiring a phone consultation with the patient."}
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Reason for escalation..."
            value={escalateReason}
            onChange={(e) => setEscalateReason(e.target.value)}
            className="min-h-[100px]"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEscalateDialog(null)}>
              Cancel
            </Button>
            <Button onClick={handleEscalate} disabled={!escalateReason.trim() || isPending}>
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Flag Dialog */}
      <Dialog open={!!flagDialog} onOpenChange={() => setFlagDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Flag for Follow-up</DialogTitle>
            <DialogDescription>Add a note about why this request needs follow-up.</DialogDescription>
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
