"use client"

import {
  AlertTriangle,
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
import type { ClinicalProfileDifference } from "@/lib/clinical/case-summary"
import { buildStaffPatientHref } from "@/lib/dashboard/routes"
import { buildPatientSnapshot, type PatientSnapshotInput } from "@/lib/doctor/patient-snapshot"
import { formatShortDateSafe } from "@/lib/format"

interface PatientProfilePanelProps {
  patient: PatientSnapshotInput
  currentRequestId: string
  admin?: boolean
}

interface PatientSummaryResponse {
  totalIntakes: number
  totalNotes: number
  clinicalDifferences: ClinicalProfileDifference[]
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
  difference,
}: {
  icon: LucideIcon
  label: string
  value: string
  difference?: ClinicalProfileDifference
}) {
  return (
    <div className="flex min-w-0 items-start gap-3 px-3 py-3">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="mt-0.5 break-words text-sm font-medium leading-relaxed text-foreground">
          {difference ? (
            <>
              <span className="mr-1 text-xs font-medium text-muted-foreground">Saved profile</span>
              <span>{value}</span>
            </>
          ) : value}
        </p>
        {difference ? (
          <p className="mt-1.5 break-words text-xs leading-relaxed text-warning">
            <span className="mr-1 font-semibold">Current request</span>
            <span>{difference.currentRequest}</span>
          </p>
        ) : null}
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
  const snapshot = buildPatientSnapshot(patient)
  const [summary, setSummary] = useState<SummaryState>(
    canLoadSummary ? { status: "loading" } : { status: "error", message: "Patient history unavailable" },
  )

  useEffect(() => {
    if (!canLoadSummary) {
      setSummary({ status: "error", message: "Patient history unavailable" })
      return
    }

    let cancelled = false
    const controller = new AbortController()
    setSummary({ status: "loading" })

    async function loadPatientSummary() {
      try {
        const response = await fetch(
          `/api/doctor/patients/${patient.id}/summary?currentRequestId=${encodeURIComponent(currentRequestId)}`,
          { signal: controller.signal },
        )
        if (!response.ok) throw new Error("Patient history unavailable")
        const data = (await response.json()) as PatientSummaryResponse
        if (!cancelled) setSummary({ status: "ready", data })
      } catch (error) {
        if (!cancelled && !controller.signal.aborted) {
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
      controller.abort()
    }
  }, [canLoadSummary, currentRequestId, patient.id])

  const healthProfile = summary.status === "ready" ? summary.data.healthProfile : null
  const clinicalDifferences = summary.status === "ready" ? summary.data.clinicalDifferences : []
  const differenceByKey = new Map(clinicalDifferences.map((difference) => [difference.key, difference]))
  const priorRequests = summary.status === "ready"
    ? summary.data.history.filter((request) => request.id !== currentRequestId)
    : []

  return (
    <DrawerPanel title="Patient profile" width={440}>
      <div className="space-y-4 px-5 py-5">
        <section className="rounded-xl border border-border/60 bg-muted/25 p-4">
          <p className="truncate text-lg font-semibold text-foreground">{patient.full_name || "Patient"}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {snapshot.ageDobLabel} · {snapshot.sex.label} · {snapshot.address.localityLabel ?? "Location not recorded"}
          </p>
          <div className="mt-3 border-t border-border/50 pt-3">
            <h3 className="text-xs font-semibold text-foreground">Identity and contact</h3>
            <dl className="mt-2 grid gap-2 text-xs sm:grid-cols-2">
              <div className="min-w-0">
                <dt className="text-muted-foreground">Phone</dt>
                <dd className="truncate font-medium text-foreground">{snapshot.phone.label}</dd>
              </div>
              <div className="min-w-0">
                <dt className="text-muted-foreground">Email</dt>
                <dd className="truncate font-medium text-foreground">{snapshot.email.label}</dd>
              </div>
            </dl>
          </div>
          {summary.status === "ready" ? (
            <p className="mt-3 text-xs font-medium text-muted-foreground">
              {summary.data.totalIntakes} requests total · {summary.data.totalNotes} notes total
            </p>
          ) : null}
        </section>

        <section aria-label="Saved clinical profile">
          <div className="mb-2 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Saved clinical profile</h3>
              {healthProfile ? (
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Patient-entered · Updated {formatShortDateSafe(healthProfile.updated_at) ?? "date unavailable"}
                </p>
              ) : summary.status === "ready" ? (
                <p className="mt-0.5 text-xs text-muted-foreground">No saved clinical profile</p>
              ) : null}
            </div>
            <div className="shrink-0">
              {summary.status === "loading" ? (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" aria-label="Loading saved clinical profile" />
              ) : clinicalDifferences.length > 0 ? (
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-warning">
                  <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
                  Review differences
                </span>
              ) : null}
            </div>
          </div>
          <div className="divide-y divide-border/50 rounded-xl border border-border/60 bg-background">
            <DetailRow
              icon={ShieldAlert}
              label="Allergies"
              value={savedProfileValue(healthProfile?.allergies, summary.status)}
              difference={differenceByKey.get("allergies")}
            />
            <DetailRow
              icon={HeartPulse}
              label="Conditions"
              value={savedProfileValue(healthProfile?.conditions, summary.status)}
              difference={differenceByKey.get("conditions")}
            />
            <DetailRow
              icon={Pill}
              label="Current medicines"
              value={savedProfileValue(healthProfile?.current_medications, summary.status)}
              difference={differenceByKey.get("current_medications")}
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
          <Link href={`${buildStaffPatientHref(patient.id)}?requestId=${encodeURIComponent(currentRequestId)}`}>
            Open full record
            <ExternalLink className="h-4 w-4" aria-hidden />
          </Link>
        </Button>
      </div>
    </DrawerPanel>
  )
}
