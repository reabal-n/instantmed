"use client"

import {
  AlertTriangle,
  ArrowUpRight,
  Command,
  Search,
  UserRound,
} from "lucide-react"
import Link from "next/link"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import { IntakeReviewPanel } from "@/components/doctor"
import { PatientProfilePanel } from "@/components/doctor/patient-profile-panel"
import type { StaffCommandItem } from "@/components/operator"
import { StaffCommandPalette } from "@/components/operator"
import { usePanel } from "@/components/panels/panel-provider"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { UserCard } from "@/components/uix"
import {
  ADMIN_INTAKE_STATUS_FILTER_OPTIONS,
  ADMIN_STATUS_PRIORITY,
  ADMIN_WORK_LANE_FILTER_OPTIONS,
  type AdminIntakeStatusFilterValue,
  type AdminWorkLaneFilterValue,
  getAdminWorkLaneForStatus,
  matchesAdminStatusFilter,
  matchesAdminWorkLaneFilter,
} from "@/lib/dashboard/admin-work-lanes"
import {
  ADMIN_OPS_HREF,
  ADMIN_PATIENTS_HREF,
  ADMIN_REFUNDS_HREF,
  buildAdminDashboardHref,
  buildAdminIntakeHref,
} from "@/lib/dashboard/routes"
import { INTAKE_STATUS, type IntakeStatus } from "@/lib/data/status"
import { buildStaffCaseSummary } from "@/lib/doctor/case-summary"
import type { PatientHandoffSummary } from "@/lib/doctor/patient-handoff"
import { formatDate } from "@/lib/format"
import { formatIntakeStatus } from "@/lib/format/intake"
import {
  ADMIN_SERVICE_FILTER_OPTIONS,
  getServicePresentation,
  matchesAdminServiceFilter,
} from "@/lib/services/service-presentation"
import { cn } from "@/lib/utils"
import type { IntakeWithPatient } from "@/types/db"

type AdminIntakeRow = IntakeWithPatient & {
  handoff?: PatientHandoffSummary | null
}

interface AdminDashboardClientProps {
  allIntakes: AdminIntakeRow[]
}

function getPatient(intake: AdminIntakeRow) {
  return intake.patient as { full_name?: string; suburb?: string; state?: string; email?: string; phone?: string } | undefined
}

function getService(intake: AdminIntakeRow) {
  return intake.service as { name?: string; short_name?: string; type?: string } | undefined
}

function getServiceDisplay(intake: AdminIntakeRow) {
  const service = getService(intake)
  return getServicePresentation({
    type: service?.type,
    category: intake.category,
    name: service?.name,
    shortName: service?.short_name,
  })
}

function getAnswersRecord(intake: AdminIntakeRow): Record<string, unknown> {
  const answers = intake.answers
  if (Array.isArray(answers)) return answers[0]?.answers ?? {}
  if (answers && typeof answers === "object" && "answers" in answers) {
    return (answers as { answers?: Record<string, unknown> }).answers ?? {}
  }
  return {}
}

function HandoffBadge({
  summary,
  compact = false,
}: {
  summary?: PatientHandoffSummary | null
  compact?: boolean
}) {
  if (!summary) return null

  if (summary.tone === "success") {
    return compact ? null : (
      <Badge
        variant="success"
        className="hidden w-fit text-[11px] xl:inline-flex"
        title={summary.tooltip}
        aria-label={summary.tooltip}
      >
        {summary.shortLabel}
      </Badge>
    )
  }

  return (
    <Badge
      variant={summary.tone === "critical" ? "destructive" : "warning"}
      className={cn(
        "max-w-full shrink-0 text-[11px]",
        summary.tone === "critical"
          ? "hover:bg-destructive/20"
          : "hover:bg-warning-light/80",
      )}
      title={`${summary.tooltip} ${summary.actionLabel}.`}
      aria-label={summary.tooltip}
    >
      <AlertTriangle className="h-3 w-3" />
      {compact ? (
        <span>{summary.shortLabel}</span>
      ) : (
        <>
          <span className="sm:hidden">{summary.shortLabel}</span>
          <span className="hidden truncate sm:inline xl:hidden">{summary.statusLabel}</span>
          <span className="hidden truncate xl:inline">{summary.detailLabel}</span>
        </>
      )}
    </Badge>
  )
}

export function AdminDashboardClient({
  allIntakes,
}: AdminDashboardClientProps) {
  const { openPanel } = usePanel()
  const [intakes, setIntakes] = useState(allIntakes)
  const [searchQuery, setSearchQuery] = useState("")
  const searchRef = useRef<HTMLInputElement>(null)
  const filteredIntakesRef = useRef<AdminIntakeRow[]>([])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [workLaneFilter, setWorkLaneFilter] = useState<AdminWorkLaneFilterValue>(() =>
    allIntakes.some((intake) => getAdminWorkLaneForStatus(intake.status) === "clinical") ? "clinical" : "all",
  )
  const [statusFilter, setStatusFilter] = useState<AdminIntakeStatusFilterValue>("all")
  const [serviceFilter, setServiceFilter] = useState<string>("all")

  useEffect(() => {
    setIntakes(allIntakes)
  }, [allIntakes])

  const filteredIntakes = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    return intakes
      .filter((intake) => {
        const patient = getPatient(intake)
        const service = getService(intake)
        const serviceDisplay = getServiceDisplay(intake)
        const normalizedPhone = patient?.phone?.replace(/\s+/g, "").toLowerCase()
        const normalizedQueryPhone = query.replace(/\s+/g, "")

        const matchesSearch =
          !query ||
          patient?.full_name?.toLowerCase().includes(query) ||
          patient?.suburb?.toLowerCase().includes(query) ||
          patient?.email?.toLowerCase().includes(query) ||
          normalizedPhone?.includes(normalizedQueryPhone) ||
          intake.id.toLowerCase().includes(query) ||
          intake.reference_number?.toLowerCase().includes(query) ||
          serviceDisplay.label.toLowerCase().includes(query) ||
          serviceDisplay.shortLabel.toLowerCase().includes(query) ||
          formatIntakeStatus(intake.status).toLowerCase().includes(query)

        const matchesStatus = matchesAdminStatusFilter(intake.status, statusFilter)
        const matchesLane = matchesAdminWorkLaneFilter(intake.status, workLaneFilter)
        const matchesService = matchesAdminServiceFilter(
          { type: service?.type, category: intake.category },
          serviceFilter,
        )

        return matchesSearch && matchesLane && matchesStatus && matchesService
      })
      .sort((a, b) => {
        const priorityDelta =
          (ADMIN_STATUS_PRIORITY[a.status] ?? 99) - (ADMIN_STATUS_PRIORITY[b.status] ?? 99)
        if (priorityDelta !== 0) return priorityDelta
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      })
  }, [intakes, searchQuery, statusFilter, serviceFilter, workLaneFilter])

  useEffect(() => {
    filteredIntakesRef.current = filteredIntakes
    setSelectedIndex((current) => Math.min(current, Math.max(filteredIntakes.length - 1, 0)))
  }, [filteredIntakes])

  const getStatusBadge = (status: string) => {
    return INTAKE_STATUS[status as IntakeStatus]?.color ?? "bg-muted text-foreground"
  }

  const openIntakeReview = useCallback((intakeId: string) => {
    const list = filteredIntakesRef.current
    const currentIndex = list.findIndex((intake) => intake.id === intakeId)

    openPanel({
      id: `admin-intake-review-${intakeId}`,
      type: "sheet",
      component: (
        <IntakeReviewPanel
          intakeId={intakeId}
          caseIndex={currentIndex >= 0 ? currentIndex : undefined}
          totalCases={list.length > 0 ? list.length : undefined}
          profileMode="admin"
          onActionComplete={() => {
            setIntakes((prev) => prev.filter((intake) => intake.id !== intakeId))
          }}
        />
      ),
    })
  }, [openPanel])

  const openPatientProfile = useCallback((intake: AdminIntakeRow) => {
    const service = getService(intake)
    openPanel({
      id: `admin-patient-profile-${intake.patient.id}`,
      type: "drawer",
      component: (
        <PatientProfilePanel
          patient={intake.patient}
          answers={getAnswersRecord(intake)}
          serviceContext={{
            category: intake.category,
            serviceType: service?.type,
            subtype: intake.subtype,
          }}
          admin
          sourceLabel={intake.reference_number || "Admin case"}
        />
      ),
    })
  }, [openPanel])

  const commandItems = useMemo<StaffCommandItem[]>(() => {
    const caseItems = filteredIntakes.slice(0, 5).flatMap((intake) => {
      const patient = getPatient(intake)
      const service = getServiceDisplay(intake)
      const summary = buildStaffCaseSummary({
        intake,
        answers: getAnswersRecord(intake),
      })
      const baseKeywords = [
        patient?.email,
        patient?.phone,
        patient?.suburb,
        intake.reference_number,
        intake.id,
        service.label,
        formatIntakeStatus(intake.status),
        summary.actionLabel,
      ].filter(Boolean).join(" ")
      const actionItem: StaffCommandItem = {
        id: `action-${intake.id}`,
        title: summary.actionLabel,
        detail: `${summary.patientName} · ${service.shortLabel} · ${summary.statusLabel}`,
        keywords: baseKeywords,
        onSelect: () => openIntakeReview(intake.id),
        tone: getAdminWorkLaneForStatus(intake.status) === "clinical" ? "warning" : "neutral",
        label: "Action",
      }
      const profileItem: StaffCommandItem = {
        id: `profile-${intake.id}`,
        title: `Profile: ${summary.patientName}`,
        detail: `${summary.snapshot.completenessLabel} · ${summary.previousLabel}`,
        keywords: `${baseKeywords} identity medicare address phone profile history`,
        onSelect: () => openPatientProfile(intake),
        tone: summary.snapshot.completenessTone === "complete" ? "success" : "warning",
        label: "Profile",
      }
      const messageItem: StaffCommandItem | null = intake.status === "pending_info"
        ? {
            id: `message-${intake.id}`,
            title: `Message ${summary.patientName}`,
            detail: "Patient is waiting on an information follow-up",
            keywords: `${baseKeywords} message patient pending info`,
            onSelect: () => openIntakeReview(intake.id),
            tone: "warning",
            label: "Message",
          }
        : null

      return [actionItem, profileItem, messageItem].filter(Boolean) as StaffCommandItem[]
    })

    return [
      ...caseItems,
      {
        id: "patients",
        title: "Patients",
        detail: "Search patient profiles and prescribing identity",
        href: ADMIN_PATIENTS_HREF,
        keywords: "patients patient profile directory medicare phone identity parchment",
        label: "Go",
      },
      {
        id: "doctor-queue",
        title: "Review",
        detail: "Open clinical reviews in this cockpit",
        href: buildAdminDashboardHref({ status: "review", anchor: "doctor-queue" }),
        keywords: [
          "doctor queue clinical approve prescribe",
          "review patient decision action",
        ].join(" "),
        label: "Go",
      },
      {
        id: "scripts",
        title: "Scripts",
        detail: "Open script-ready cases in this cockpit",
        href: buildAdminDashboardHref({ status: "scripts", anchor: "doctor-queue" }),
        keywords: "scripts prescriptions parchment delivery",
        label: "Go",
      },
      {
        id: "ops",
        title: "Ops",
        detail: "Webhook, email, script, and stale-request recovery",
        href: ADMIN_OPS_HREF,
        keywords: "operations recovery webhook email stale",
        label: "Go",
      },
      {
        id: "refunds",
        title: "Refunds",
        detail: "Refund decisions and failures",
        href: ADMIN_REFUNDS_HREF,
        keywords: "refund finance payment",
        label: "Go",
      },
    ]
  }, [filteredIntakes, openIntakeReview, openPatientProfile])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target
      const isTyping = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement
      const isInsideDialog = target instanceof Element && Boolean(target.closest("[role='dialog']"))

      if (isInsideDialog) return

      if (event.key === "/" && !isTyping) {
        event.preventDefault()
        searchRef.current?.focus()
        return
      }

      if (event.key === "ArrowDown") {
        event.preventDefault()
        setSelectedIndex((current) => Math.min(current + 1, Math.max(filteredIntakesRef.current.length - 1, 0)))
        return
      }

      if (event.key === "ArrowUp") {
        event.preventDefault()
        setSelectedIndex((current) => Math.max(current - 1, 0))
        return
      }

      if (event.key === "Enter") {
        const selected = filteredIntakesRef.current[selectedIndex]
        if (!selected) return
        event.preventDefault()
        openIntakeReview(selected.id)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [openIntakeReview, selectedIndex])

  return (
    <div className="h-full min-h-0">
      <Card className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border-border/60 shadow-sm shadow-primary/[0.03]">
        <CardContent className="flex min-h-0 flex-1 flex-col p-3">
          <div className="shrink-0 rounded-lg border border-border/50 bg-muted/20 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Command className="h-4 w-4" aria-hidden />
                </span>
                <div className="min-w-0">
                  <h2 className="text-base font-semibold tracking-tight text-foreground">
                    Find anything
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Search the recent request ledger, then open the case.
                  </p>
                </div>
              </div>
              <Badge variant="outline" className="shrink-0 text-xs">
                {filteredIntakes.length} result{filteredIntakes.length === 1 ? "" : "s"}
              </Badge>
              <StaffCommandPalette
                items={commandItems}
                buttonLabel="Staff search"
                title="Staff search"
                description="Search current cases and jump to common admin or doctor paths."
              />
            </div>

            <div className="mt-3 grid shrink-0 gap-2 lg:grid-cols-[minmax(0,1fr)_180px_190px]">
              <div className="min-w-0">
                <Input
                  ref={searchRef}
                  placeholder="Search patient, request ID, phone, email, suburb..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  startContent={<Search className="h-4 w-4 text-muted-foreground" />}
                />
              </div>
              <Select
                value={statusFilter}
                onValueChange={(value) => setStatusFilter(value as AdminIntakeStatusFilterValue)}
              >
                <SelectTrigger className="w-full" aria-label="Filter intakes by status">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  {ADMIN_INTAKE_STATUS_FILTER_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.value === "all" ? "All statuses" : formatIntakeStatus(option.value)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={serviceFilter} onValueChange={setServiceFilter}>
                <SelectTrigger className="w-full" aria-label="Filter intakes by service">
                  <SelectValue placeholder="All Services" />
                </SelectTrigger>
                <SelectContent>
                  {ADMIN_SERVICE_FILTER_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div
              className="mt-2 flex gap-1 overflow-x-auto rounded-lg bg-background/70 p-1"
              aria-label="Filter intakes by work lane"
            >
              {ADMIN_WORK_LANE_FILTER_OPTIONS.map((option) => {
                const active = workLaneFilter === option.value
                return (
                  <button
                    key={option.value}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setWorkLaneFilter(option.value)}
                    className={cn(
                      "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md px-3 text-xs font-semibold transition-colors",
                      active
                        ? "bg-white text-foreground shadow-sm shadow-primary/[0.04] dark:bg-card"
                        : "text-muted-foreground hover:bg-white/70 hover:text-foreground dark:hover:bg-card/70",
                    )}
                  >
                    {option.label}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="mt-3 min-h-0 flex-1 overflow-auto rounded-lg border border-border/50">
            {filteredIntakes.length > 0 ? (
              <div className="divide-y divide-border/50">
                {filteredIntakes.map((intake) => (
                  <IntakeResultRow
                    key={intake.id}
                    intake={intake}
                    getStatusBadge={getStatusBadge}
                    isSelected={filteredIntakes[selectedIndex]?.id === intake.id}
                    onOpen={() => openIntakeReview(intake.id)}
                    onProfile={() => openPatientProfile(intake)}
                  />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 px-4 py-10 text-center text-muted-foreground">
                <Search className="h-5 w-5" aria-hidden />
                <p className="text-sm">No intakes match these filters</p>
                <p className="text-xs">
                  Try clearing the search or switching the status to All
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function IntakeResultRow({
  intake,
  getStatusBadge,
  isSelected,
  onOpen,
  onProfile,
}: {
  intake: AdminIntakeRow
  getStatusBadge: (status: string) => string
  isSelected: boolean
  onOpen: () => void
  onProfile: () => void
}) {
  const patient = getPatient(intake)
  const service = getServiceDisplay(intake)
  const place = [patient?.suburb, patient?.state].filter(Boolean).join(", ")
  const summary = buildStaffCaseSummary({ intake, answers: getAnswersRecord(intake) })
  const isQuietRow = summary.isDone || (summary.isLowPriority && !intake.handoff)

  return (
    <div
      className={cn(
        "grid gap-2 bg-card transition-colors md:grid-cols-[minmax(0,1fr)_auto] md:items-center",
        isQuietRow ? "p-1.5" : "p-2.5",
        isSelected ? "bg-primary/5 ring-1 ring-inset ring-primary/25" : "hover:bg-muted/35",
      )}
    >
      <button
        type="button"
        onClick={onOpen}
        data-testid={`admin-intake-open-${intake.id}`}
        className={cn(
          "grid min-w-0 gap-3 rounded-lg px-1.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 md:grid-cols-[minmax(0,1.15fr)_minmax(160px,0.75fr)] md:items-center",
          isQuietRow ? "py-1" : "py-1.5",
        )}
      >
        <div className="min-w-0 space-y-1.5">
          <UserCard
            name={patient?.full_name || "Unknown"}
            description={place || patient?.email || "No location"}
            size="sm"
            className="min-w-0"
          />
          {!isQuietRow && <HandoffBadge summary={intake.handoff} />}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">{service.label}</p>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <Badge className={cn("text-xs", getStatusBadge(intake.status))}>
              {formatIntakeStatus(intake.status)}
            </Badge>
            {intake.reference_number && (
              <span className="truncate text-xs text-muted-foreground">{intake.reference_number}</span>
            )}
          </div>
        </div>
      </button>
      <div className="flex items-center justify-between gap-2 px-1.5 md:justify-end md:px-0">
        <span className="text-xs font-medium text-muted-foreground">
          {formatDate(intake.created_at)}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5 px-2.5 text-xs"
          onClick={onProfile}
        >
          <UserRound className="h-3.5 w-3.5" />
          Profile
        </Button>
        <Link
          href={buildAdminIntakeHref(intake.id)}
          className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border/50 px-2.5 text-xs font-semibold text-foreground transition-colors hover:border-primary/40 hover:bg-muted/40"
        >
          Full case
          <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  )
}
