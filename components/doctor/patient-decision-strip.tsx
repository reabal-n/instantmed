"use client"

import type { ReactNode } from "react"

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
  const ageDobBlocked = snapshot.missingCriticalFields.includes("DOB")
  const sexBlocked = snapshot.missingCriticalFields.includes("Sex")
  const facts: SafetyFact[] = [
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
  ]

  return (
    <section
      aria-label="Patient safety context"
      className={cn(
        "shrink-0 rounded-xl border border-border/60 bg-muted/20 px-3 py-2",
        className,
      )}
      data-patient-safety-band
    >
      <div className="flex flex-col gap-2 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0">
          <h2 className="break-words text-lg font-semibold leading-tight tracking-tight text-foreground">
            {summary.patientName}
          </h2>
          <p
            className="mt-1 flex flex-wrap items-center gap-x-1.5 text-xs font-medium text-muted-foreground"
            aria-label={`Age and date of birth: ${snapshot.ageDobLabel}; sex: ${snapshot.sex.label}`}
          >
            <span className={cn(ageDobBlocked && "text-warning")}>{snapshot.ageDobLabel}</span>
            <span aria-hidden="true">·</span>
            <span className={cn(sexBlocked && "text-warning")}>{snapshot.sex.label}</span>
          </p>
        </div>
        {actions ? (
          <div className="flex shrink-0 flex-wrap items-center gap-1.5" aria-label="Patient actions">
            {actions}
          </div>
        ) : null}
      </div>

      <dl className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
        {facts.map(({ label, value, blocked, readiness }) => (
          <div
            key={label}
            className={cn(
              "flex min-w-0 flex-wrap items-baseline gap-x-1.5",
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
                "break-words text-[13px] font-semibold leading-5 text-foreground tabular-nums",
                blocked && "text-warning",
              )}
              title={value}
            >
              {label === "Phone" && snapshot.phone.present ? (
                <a
                  href={`tel:${snapshot.phone.label.replace(/[^+\d]/g, "")}`}
                  aria-label={`Call patient on ${value}`}
                  className="inline-flex min-h-11 items-center underline decoration-border underline-offset-4 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:min-h-0"
                >
                  {value}
                </a>
              ) : value}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
