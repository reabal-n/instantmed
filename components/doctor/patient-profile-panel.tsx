"use client"

import {
  ExternalLink,
  HeartPulse,
  Loader2,
  type LucideIcon,
  Pill,
  ShieldAlert,
} from "lucide-react"
import Link from "next/link"
import { useEffect, useState } from "react"

import { PatientTimeline } from "@/components/doctor/patient-timeline"
import { DrawerPanel } from "@/components/panels/drawer-panel"
import { Button } from "@/components/ui/button"
import { buildStaffPatientHref } from "@/lib/dashboard/routes"
import type { PatientSnapshotInput } from "@/lib/doctor/patient-snapshot"

interface PatientProfilePanelProps {
  patient: PatientSnapshotInput
  currentRequestId: string
  admin?: boolean
}

interface PatientSummaryResponse {
  totalIntakes: number
  totalNotes: number
  healthProfile: {
    allergies: string[]
    conditions: string[]
    current_medications: string[]
    updated_at: string
  } | null
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
  | { status: "loading" }
  | { status: "ready"; data: PatientSummaryResponse }
  | { status: "error"; message: string }

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function DetailRow({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon
  label: string
  value: string
}) {
  return (
    <div className="flex min-w-0 items-start gap-3 px-3 py-3">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="mt-0.5 break-words text-sm font-medium leading-relaxed text-foreground">{value}</p>
      </div>
    </div>
  )
}

function savedProfileValue(values: string[] | undefined, status: SummaryState["status"]): string {
  if (status === "loading") return "Loading"
  if (status === "error") return "Unavailable"
  if (values === undefined) return "Not recorded"
  if (values.length === 0) return "None recorded in saved profile"
  return values.join(" · ")
}

export function PatientProfilePanel({
  patient,
  currentRequestId,
  admin = false,
}: PatientProfilePanelProps) {
  const canLoadSummary = UUID_RE.test(patient.id)
  const [summary, setSummary] = useState<SummaryState>(
    canLoadSummary ? { status: "loading" } : { status: "error", message: "Patient history unavailable" },
  )

  useEffect(() => {
    if (!canLoadSummary) {
      setSummary({ status: "error", message: "Patient history unavailable" })
      return
    }

    let cancelled = false
    setSummary({ status: "loading" })

    async function loadPatientSummary() {
      try {
        const response = await fetch(`/api/doctor/patients/${patient.id}/summary`)
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

    void loadPatientSummary()
    return () => {
      cancelled = true
    }
  }, [canLoadSummary, patient.id])

  const healthProfile = summary.status === "ready" ? summary.data.healthProfile : null
  const priorRequests = summary.status === "ready"
    ? summary.data.history.filter((request) => request.id !== currentRequestId)
    : []

  return (
    <DrawerPanel title="Patient profile" width={440}>
      <div className="space-y-4 px-5 py-5">
        <section className="rounded-xl border border-border/60 bg-muted/25 p-4">
          <p className="truncate text-lg font-semibold text-foreground">{patient.full_name || "Patient"}</p>
          <p className="mt-1 text-sm text-muted-foreground">Longitudinal snapshot</p>
          {summary.status === "ready" ? (
            <p className="mt-3 text-xs font-medium text-muted-foreground">
              {summary.data.totalIntakes} requests total · {summary.data.totalNotes} notes total
            </p>
          ) : null}
        </section>

        <section aria-label="Saved clinical profile">
          <div className="mb-2 flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-foreground">Saved clinical profile</h3>
            {summary.status === "loading" ? (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" aria-label="Loading saved clinical profile" />
            ) : null}
          </div>
          <div className="divide-y divide-border/50 rounded-xl border border-border/60 bg-background">
            <DetailRow
              icon={ShieldAlert}
              label="Allergies"
              value={savedProfileValue(healthProfile?.allergies, summary.status)}
            />
            <DetailRow
              icon={HeartPulse}
              label="Conditions"
              value={savedProfileValue(healthProfile?.conditions, summary.status)}
            />
            <DetailRow
              icon={Pill}
              label="Current medicines"
              value={savedProfileValue(healthProfile?.current_medications, summary.status)}
            />
          </div>
        </section>

        <section aria-label="Recent activity">
          {summary.status === "loading" ? (
            <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-background p-4 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              Loading recent activity
            </div>
          ) : null}

          {summary.status === "error" ? (
            <div className="rounded-xl border border-border/60 bg-background p-4">
              <p className="text-sm text-muted-foreground">{summary.message}</p>
            </div>
          ) : null}

          {summary.status === "ready" ? (
            <PatientTimeline
              requests={priorRequests}
              notes={summary.data.notes}
              admin={admin}
              compact
              maxItems={3}
              title="Recent activity"
              emptyLabel="No prior activity recorded."
            />
          ) : null}
        </section>

        <Button asChild variant="outline" className="w-full justify-between">
          <Link href={buildStaffPatientHref(patient.id)}>
            Open full record
            <ExternalLink className="h-4 w-4" aria-hidden />
          </Link>
        </Button>
      </div>
    </DrawerPanel>
  )
}
