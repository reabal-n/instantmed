"use client"

import {
  Calendar,
  CreditCard,
  ExternalLink,
  FileText,
  Loader2,
  type LucideIcon,
  Mail,
  MapPin,
  Phone,
  Pill,
  ShieldCheck,
  UserRound,
} from "lucide-react"
import Link from "next/link"
import { useEffect, useState } from "react"

import { PatientTimeline } from "@/components/doctor/patient-timeline"
import { DrawerPanel } from "@/components/panels/drawer-panel"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { buildStaffPatientHref } from "@/lib/dashboard/routes"
import {
  buildPatientSnapshot,
  getPatientSnapshotOptionsForCase,
  type PatientSnapshotInput,
} from "@/lib/doctor/patient-snapshot"
import { formatIntakeStatus } from "@/lib/format/intake"
import { cn } from "@/lib/utils"

interface PatientProfilePanelProps {
  patient: PatientSnapshotInput
  answers?: Record<string, unknown> | null
  serviceContext?: {
    category?: string | null
    serviceType?: string | null
    subtype?: string | null
  }
  admin?: boolean
  sourceLabel?: string
  fullRecordHref?: string | null
  loadHistory?: boolean
}

interface PatientSummaryResponse {
  totalIntakes: number
  history: Array<{
    id: string
    reference_number: string | null
    status: string
    service_label: string
    created_at: string
  }>
  notes: Array<{
    id: string
    note_type: string
    content: string
    created_at: string
    created_by_name: string | null
  }>
}

type SummaryState =
  | { status: "idle" | "loading" }
  | { status: "ready"; data: PatientSummaryResponse }
  | { status: "error"; message: string }

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function DetailRow({
  icon: Icon,
  label,
  value,
  mono,
}: {
  icon: LucideIcon
  label: string
  value: string
  mono?: boolean
}) {
  return (
    <div className="flex min-w-0 items-start gap-3 rounded-lg border border-border/45 bg-background px-3 py-2.5">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className={cn("mt-0.5 break-words text-sm font-semibold text-foreground", mono && "font-mono text-[13px]")}>
          {value}
        </p>
      </div>
    </div>
  )
}

export function PatientProfilePanel({
  patient,
  answers,
  serviceContext,
  admin = false,
  sourceLabel = "Current case",
  fullRecordHref,
  loadHistory = true,
}: PatientProfilePanelProps) {
  const snapshot = buildPatientSnapshot(patient, {
    ...getPatientSnapshotOptionsForCase({
      answers,
      category: serviceContext?.category,
      serviceType: serviceContext?.serviceType,
      subtype: serviceContext?.subtype,
    }),
    answers,
  })
  let profileHref: string | null
  if (fullRecordHref === undefined) {
    profileHref = admin ? buildStaffPatientHref(snapshot.id) : snapshot.profileHref
  } else {
    profileHref = fullRecordHref
  }
  const identityBadgeVariant =
    snapshot.completenessTone === "complete"
      ? "outline"
      : snapshot.completenessTone === "partial"
        ? "warning"
        : "destructive"
  const [summary, setSummary] = useState<SummaryState>({ status: "idle" })
  const canLoadHistory = loadHistory && UUID_RE.test(snapshot.id)
  const latestHistory = summary.status === "ready" ? summary.data.history[0] ?? null : null
  const prescribingReady = snapshot.missingCriticalFields.length === 0

  useEffect(() => {
    if (!canLoadHistory) {
      setSummary({ status: "idle" })
      return
    }

    let cancelled = false
    setSummary({ status: "loading" })

    async function loadPatientSummary() {
      try {
        const response = await fetch(`/api/doctor/patients/${snapshot.id}/summary`)
        if (!response.ok) throw new Error("Patient history unavailable")
        const data = (await response.json()) as PatientSummaryResponse
        if (!cancelled) setSummary({ status: "ready", data })
      } catch (error) {
        if (!cancelled) {
          setSummary({
            status: "error",
            message: error instanceof Error ? error.message : "Patient history unavailable",
          })
        }
      }
    }

    loadPatientSummary()
    return () => {
      cancelled = true
    }
  }, [canLoadHistory, snapshot.id])

  return (
    <DrawerPanel title="Patient profile" width={440}>
      <div className="space-y-4 px-5 py-5">
        <section className="rounded-xl border border-border/60 bg-muted/25 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-lg font-semibold text-foreground">{snapshot.name}</p>
              <p className="mt-1 text-sm text-muted-foreground">{sourceLabel}</p>
            </div>
            <Badge
              variant={identityBadgeVariant}
              size="sm"
              className={cn("shrink-0", snapshot.completenessTone === "complete" && "text-muted-foreground")}
            >
              <ShieldCheck className="h-3 w-3" />
              {snapshot.completenessTone === "complete" ? "Details complete" : snapshot.completenessLabel}
            </Badge>
          </div>
          {snapshot.missingCriticalFields.length > 0 && (
            <p className="mt-3 text-xs font-medium text-muted-foreground">
              Missing: {snapshot.missingCriticalFields.join(", ")}
            </p>
          )}
        </section>

        <section className="space-y-2" aria-label="Identity risk">
          <DetailRow icon={Calendar} label="Date of birth" value={snapshot.ageDobLabel} />
          <DetailRow
            icon={UserRound}
            label="Sex"
            value={snapshot.sex.label}
          />
        </section>

        <section className="rounded-xl border border-border/60 bg-background px-3 py-3" aria-label="Prescribing readiness">
          <div className="flex items-start gap-3">
            <span className={cn(
              "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
              prescribingReady ? "bg-muted text-muted-foreground" : "bg-warning-light text-warning",
            )}>
              <Pill className="h-4 w-4" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Prescribing readiness
              </p>
              <p className="mt-0.5 text-sm font-semibold text-foreground">
                {prescribingReady ? "Ready for this pathway" : `Missing ${snapshot.missingCriticalFields.join(", ")}`}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Missing identity blocks Parchment/script launch, not case review.
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-border/60 bg-background px-3 py-3" aria-label="Latest request">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <FileText className="h-4 w-4" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Latest request
              </p>
              <p className="mt-0.5 truncate text-sm font-semibold text-foreground">
                {latestHistory
                  ? `${latestHistory.service_label} · ${formatIntakeStatus(latestHistory.status)}`
                  : summary.status === "loading"
                    ? "Loading latest request"
                    : sourceLabel}
              </p>
            </div>
          </div>
        </section>

        <details className="rounded-xl border border-border/60 bg-background">
          <summary className="cursor-pointer px-3 py-2.5 text-sm font-semibold text-muted-foreground">
            Contact and identifiers
          </summary>
          <div className="space-y-2 border-t border-border/60 p-3">
            <DetailRow
              icon={CreditCard}
              label="Medicare"
              value={snapshot.medicare.label}
              mono={snapshot.medicare.present}
            />
            <DetailRow icon={Phone} label="Phone" value={snapshot.phone.label} />
            <DetailRow icon={Mail} label="Email" value={snapshot.email.label} />
            <DetailRow icon={MapPin} label="Address" value={snapshot.address.label} />
          </div>
        </details>

        {loadHistory ? (
          <section aria-label="Patient timeline">
            {summary.status === "loading" && (
              <div className="rounded-xl border border-border/60 bg-background p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  Loading timeline
                </div>
              </div>
            )}

            {summary.status === "error" && (
              <div className="rounded-xl border border-border/60 bg-background p-4">
                <p className="text-sm text-muted-foreground">{summary.message}</p>
              </div>
            )}

            {summary.status === "ready" && (
              <PatientTimeline
                requests={summary.data.history}
                notes={summary.data.notes}
                admin={admin}
                compact
                maxItems={5}
                title="Timeline"
                emptyLabel="No previous requests recorded."
              />
            )}
          </section>
        ) : null}

        {profileHref && (
          <Button asChild variant="outline" className="w-full justify-between">
            <Link href={profileHref}>
              Open full record
              <ExternalLink className="h-4 w-4" aria-hidden />
            </Link>
          </Button>
        )}
      </div>
    </DrawerPanel>
  )
}
