"use client"

import {
  Calendar,
  CreditCard,
  ExternalLink,
  Loader2,
  type LucideIcon,
  Mail,
  MapPin,
  Phone,
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
      ? "success"
      : snapshot.completenessTone === "partial"
        ? "warning"
        : "destructive"
  const [summary, setSummary] = useState<SummaryState>({ status: "idle" })
  const canLoadHistory = loadHistory && UUID_RE.test(snapshot.id)

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
            <Badge variant={identityBadgeVariant} size="sm" className="shrink-0">
              <ShieldCheck className="h-3 w-3" />
              {snapshot.completenessTone === "complete" ? "Ready" : snapshot.completenessLabel}
            </Badge>
          </div>
          {snapshot.missingCriticalFields.length > 0 && (
            <p className="mt-3 text-xs font-medium text-muted-foreground">
              Missing: {snapshot.missingCriticalFields.join(", ")}
            </p>
          )}
        </section>

        <section aria-label="Patient identifiers" className="space-y-2">
          <DetailRow icon={Calendar} label="Date of birth" value={snapshot.ageDobLabel} />
          <DetailRow
            icon={UserRound}
            label="Sex"
            value={snapshot.sex.label}
          />
          <DetailRow
            icon={CreditCard}
            label="Medicare"
            value={snapshot.medicare.label}
            mono={snapshot.medicare.present}
          />
        </section>

        <section aria-label="Patient contact details" className="space-y-2">
          <DetailRow icon={Phone} label="Phone" value={snapshot.phone.label} />
          <DetailRow icon={Mail} label="Email" value={snapshot.email.label} />
          <DetailRow icon={MapPin} label="Address" value={snapshot.address.label} />
        </section>

        {summary.status === "loading" && (
          <section className="rounded-xl border border-border/60 bg-background p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              Loading history
            </div>
          </section>
        )}

        {summary.status === "error" && (
          <section className="rounded-xl border border-border/60 bg-background p-4">
            <p className="text-sm text-muted-foreground">{summary.message}</p>
          </section>
        )}

        {summary.status === "ready" && (
          <PatientTimeline
            requests={summary.data.history}
            notes={summary.data.notes}
            admin={admin}
            compact
            maxItems={5}
            title="Clinical history"
            emptyLabel="No previous requests recorded."
          />
        )}

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
