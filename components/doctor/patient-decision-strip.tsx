"use client"

import type { ReactNode } from "react"

import { AttributionChip } from "@/components/doctor/attribution-chip"
import { buildStaffCaseSummary } from "@/lib/doctor/case-summary"
import { requiresPrescribingIdentityForCase } from "@/lib/doctor/patient-snapshot"
import { cn } from "@/lib/utils"
import { formatPhoneNumber } from "@/lib/validation/australian-phone"
import type { IntakeWithDetails, IntakeWithPatient } from "@/types/db"

type StripIntake = IntakeWithDetails | IntakeWithPatient

interface PatientDecisionStripProps {
  intake: StripIntake
  answers?: Record<string, unknown>
  previousIntakes?: IntakeWithPatient[]
  previousIntakeCount?: number
  service?: { name?: string | null; type?: string | null; short_name?: string | null }
  actions?: ReactNode
  className?: string
}

interface SafetyFact {
  label: string
  value: string
  blocked?: boolean
  readiness?: "ready" | "blocked" | "not-required"
}

const IDENTIFIER_BLOCKER_PREFIXES = [
  "Medicare",
  "Valid Medicare",
]

function getLandingPathname(value: string | null | undefined): string {
  const trimmed = value?.trim()
  if (!trimmed) return ""

  try {
    return new URL(trimmed, "https://instantmed.com.au").pathname
  } catch {
    return trimmed.split(/[?#]/, 1)[0] ?? ""
  }
}

function getIdentifierReadiness({
  intake,
  serviceType,
  missingCriticalFields,
}: {
  intake: StripIntake
  serviceType?: string | null
  missingCriticalFields: string[]
}): Pick<SafetyFact, "value" | "blocked" | "readiness"> {
  const requiresIdentifier = requiresPrescribingIdentityForCase({
    category: intake.category,
    serviceType,
    subtype: intake.subtype,
  })

  if (!requiresIdentifier) {
    return { value: "Not required", readiness: "not-required" }
  }

  const identifierBlockers = missingCriticalFields.filter((field) =>
    IDENTIFIER_BLOCKER_PREFIXES.some((prefix) => field.startsWith(prefix)),
  )
  if (identifierBlockers.length === 0) {
    return { value: "Ready", readiness: "ready" }
  }

  return { value: "Needs details", blocked: true, readiness: "blocked" }
}

export function PatientDecisionStrip({
  intake,
  answers = {},
  previousIntakes = [],
  previousIntakeCount,
  service: serviceProp,
  actions,
  className,
}: PatientDecisionStripProps) {
  const summary = buildStaffCaseSummary({
    intake,
    answers,
    previousIntakes,
    service: serviceProp,
  })
  const { snapshot } = summary
  const serviceType = serviceProp?.type ?? intake.service?.type
  const identifierReadiness = getIdentifierReadiness({
    intake,
    serviceType,
    missingCriticalFields: snapshot.missingCriticalFields,
  })
  const priorRequestCount = previousIntakeCount ?? previousIntakes.length
  const visitLabel = priorRequestCount > 0
    ? `${priorRequestCount} prior request${priorRequestCount === 1 ? "" : "s"}`
    : "First visit"
  const facts: SafetyFact[] = [
    {
      label: "Age / DOB",
      value: snapshot.ageDobLabel,
      blocked: snapshot.missingCriticalFields.includes("DOB"),
    },
    {
      label: "Sex",
      value: snapshot.sex.label,
      blocked: snapshot.missingCriticalFields.includes("Sex"),
    },
    {
      label: "Location",
      value: snapshot.address.localityLabel ?? "Not provided",
      blocked: snapshot.missingCriticalFields.some((field) =>
        field === "Address" || field === "Address suburb" || field === "Address state",
      ),
    },
    {
      label: "Phone",
      value: snapshot.phone.present
        ? formatPhoneNumber(snapshot.phone.label)
        : "Not provided",
      blocked: snapshot.missingCriticalFields.includes("Phone"),
    },
    {
      label: "Medicare / IHI",
      ...identifierReadiness,
    },
    { label: "Visits", value: visitLabel },
  ]

  return (
    <section
      aria-label="Patient safety context"
      className={cn(
        "shrink-0 rounded-xl border border-border/60 bg-muted/20 px-3.5 py-3",
        className,
      )}
      data-patient-safety-band
    >
      <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0">
          <h2 className="truncate text-xl font-semibold leading-tight tracking-tight text-foreground">
            {summary.patientName}
          </h2>
          <AttributionChip
            attribution={intake}
            landingPage={getLandingPathname(intake.landing_page)}
            className="mt-1 max-w-full"
          />
        </div>
        {actions ? (
          <div className="flex shrink-0 flex-wrap items-center gap-1.5" aria-label="Patient actions">
            {actions}
          </div>
        ) : null}
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3 xl:grid-cols-6">
        {facts.map(({ label, value, blocked, readiness }) => (
          <div
            key={label}
            className={cn(
              "min-w-0 border-l border-border/55 pl-2.5 first:border-l-0 first:pl-0 xl:first:border-l-0",
              blocked && "border-warning-border",
            )}
            data-readiness={readiness}
          >
            <dt
              className={cn(
                "text-[11px] font-medium text-muted-foreground",
                blocked && "text-warning",
              )}
            >
              {label}
            </dt>
            <dd
              className={cn(
                "mt-0.5 truncate text-[13px] font-semibold leading-5 text-foreground tabular-nums",
                blocked && "text-warning",
              )}
              title={value}
            >
              {value}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
