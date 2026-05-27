"use client"

import {
  Calendar,
  ClipboardCheck,
  CreditCard,
  FileText,
  History,
  MapPin,
  Phone,
  Users,
} from "lucide-react"
import { useState } from "react"

import { Badge } from "@/components/ui/badge"
import { buildStaffCaseSummary } from "@/lib/doctor/case-summary"
import { fetchWithCsrf } from "@/lib/security/csrf-client"
import { cn } from "@/lib/utils"
import type { IntakeWithDetails, IntakeWithPatient } from "@/types/db"

type StripIntake = IntakeWithDetails | IntakeWithPatient
type SensitiveIdentifier = "medicare" | "phone"
type IdentifierRevealAudit = SensitiveIdentifier | "identity"

interface PatientDecisionStripProps {
  intake: StripIntake
  answers?: Record<string, unknown>
  previousIntakes?: IntakeWithPatient[]
  service?: { name?: string; type?: string; short_name?: string }
  doctorNotes?: string | null
  compact?: boolean
  showPatientName?: boolean
  summaryOnly?: boolean
  revealIdentityByDefault?: boolean
  className?: string
}

function maskIdentifier(value: string): string {
  const compact = value.replace(/\s+/g, "")
  if (!compact || value === "Not provided") return value
  return `Hidden ending ${compact.slice(-3)}`
}

export function PatientDecisionStrip({
  intake,
  answers = {},
  previousIntakes = [],
  service: serviceProp,
  doctorNotes,
  compact = false,
  showPatientName = true,
  summaryOnly = false,
  revealIdentityByDefault = false,
  className,
}: PatientDecisionStripProps) {
  const [revealedIdentifiers, setRevealedIdentifiers] = useState<Set<SensitiveIdentifier>>(() =>
    new Set(revealIdentityByDefault ? ["medicare", "phone"] : []),
  )
  const summary = buildStaffCaseSummary({
    intake,
    answers,
    previousIntakes,
    service: serviceProp,
    doctorNotes,
  })
  const { snapshot } = summary

  const fields = [
    { label: "DOB", value: snapshot.ageDobLabel, icon: Calendar },
    { label: "Sex", value: snapshot.sex.label, icon: Users, missing: snapshot.missingCriticalFields.includes("Sex") },
    { label: "Medicare", value: snapshot.medicare.label, icon: CreditCard, mono: snapshot.medicare.present },
    { label: "Phone", value: snapshot.phone.label, icon: Phone },
    { label: "Address", value: snapshot.address.label, icon: MapPin, wide: true },
    { label: "Last request", value: summary.previousLabel, icon: History, wide: true },
  ]
  const compactHeading = compact && summaryOnly
    ? "Patient details"
    : showPatientName ? summary.patientName : summary.serviceShortLabel
  const compactSubheading = compact && summaryOnly
    ? "Identity and notes"
    : showPatientName ? summary.serviceShortLabel : "Patient details"
  const summaryFacts = [
    { label: "DOB", value: snapshot.ageDobLabel, mono: false },
    {
      label: "Medicare",
      value: snapshot.medicare.present && !revealedIdentifiers.has("medicare")
        ? maskIdentifier(snapshot.medicare.label)
        : snapshot.medicare.label,
      mono: snapshot.medicare.present,
      sensitive: snapshot.medicare.present ? "medicare" as const : null,
    },
    {
      label: "Phone",
      value: snapshot.phone.present && !revealedIdentifiers.has("phone")
        ? maskIdentifier(snapshot.phone.label)
        : snapshot.phone.label,
      mono: false,
      sensitive: snapshot.phone.present ? "phone" as const : null,
    },
    { label: "Address", value: snapshot.address.label, mono: false, sensitive: null },
  ]
  const revealIdentifiers = (identifiers: SensitiveIdentifier[]) => {
    const hidden = identifiers.filter((identifier) => !revealedIdentifiers.has(identifier))
    if (hidden.length === 0) return
    setRevealedIdentifiers((prev) => {
      const next = new Set(prev)
      hidden.forEach((identifier) => next.add(identifier))
      return next
    })
    const identifierReveal: IdentifierRevealAudit = hidden.length > 1 ? "identity" : hidden[0]!
    void fetchWithCsrf(`/api/doctor/intakes/${intake.id}/audit-view`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        serviceType: serviceProp?.type,
        identifierReveal,
      }),
      keepalive: true,
    }).catch(() => undefined)
  }
  const hiddenIdentifiers = summaryFacts
    .map((fact) => fact.sensitive)
    .filter((identifier): identifier is SensitiveIdentifier => {
      if (!identifier) return false
      return !revealedIdentifiers.has(identifier)
    })

  return (
    <section
      aria-label="Patient details for this decision"
      className={cn(
        "rounded-xl border border-border/60 bg-muted/25 px-3.5 py-3",
        compact && "px-3 py-2.5",
        className,
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">
            {compactHeading}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {compactSubheading}
          </p>
        </div>
        {compact && summaryOnly ? (
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-medium text-muted-foreground">
            {hiddenIdentifiers.length > 0 ? (
              <button
                type="button"
                className="inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-semibold text-muted-foreground underline underline-offset-2 hover:text-foreground"
                onClick={() => revealIdentifiers(hiddenIdentifiers)}
                aria-label="Show patient identity"
              >
                Show identity
              </button>
            ) : null}
            <span className={cn("inline-flex items-center gap-1", snapshot.completenessTone !== "complete" && "text-warning")}>
              <ClipboardCheck className="h-3 w-3" aria-hidden />
              {snapshot.completenessTone === "complete" ? "Details complete" : snapshot.completenessLabel}
            </span>
            <span className={cn("inline-flex items-center gap-1", !summary.notesReady && "text-warning")}>
              <FileText className="h-3 w-3" aria-hidden />
              {summary.notesLabel}
            </span>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge
              variant={snapshot.completenessTone === "complete" ? "outline" : snapshot.completenessTone === "partial" ? "warning" : "destructive"}
              size="sm"
              className={cn("shrink-0", snapshot.completenessTone === "complete" && "text-muted-foreground")}
            >
              <ClipboardCheck className="h-3 w-3" />
              {snapshot.completenessTone === "complete" ? "Details complete" : snapshot.completenessLabel}
            </Badge>
            <Badge
              variant={summary.notesReady ? "outline" : "warning"}
              size="sm"
              className={cn("shrink-0", summary.notesReady && "text-muted-foreground")}
            >
              <FileText className="h-3 w-3" />
              {summary.notesLabel}
            </Badge>
          </div>
        )}
      </div>
      {summaryOnly ? (
        <div className="mt-3 space-y-2">
          <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {summaryFacts.map((item) => (
              <div
                key={item.label}
                className={cn(
                  "min-w-0",
                  compact
                    ? "border-l border-border/50 pl-2.5"
                    : "rounded-lg bg-card px-2.5 py-2 ring-1 ring-border/35",
                )}
              >
                <dt className="text-[11px] font-medium uppercase tracking-[0.08em] text-slate-500 dark:text-muted-foreground">
                  {item.label}
                </dt>
                <dd className={cn("mt-0.5 flex min-w-0 items-center gap-2 text-sm font-semibold text-foreground tabular-nums", item.mono && "font-mono")}>
                  <span className="truncate">{item.value}</span>
                </dd>
              </div>
            ))}
          </dl>
          <p className="truncate text-xs text-muted-foreground">
            {summary.previousLabel && summary.previousLabel !== "First request" ? summary.previousLabel : "First visit"}
          </p>
        </div>
      ) : (
      <dl className={cn("mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3", compact && "mt-2")}>
        {fields.map(({ label, value, icon: Icon, mono, wide, missing }) => (
          <div
            key={label}
            className={cn(
              "flex min-w-0 items-start gap-2 rounded-lg bg-card px-2.5 py-2 text-xs ring-1 ring-border/40",
              missing && "bg-warning-light/55 ring-warning-border",
              wide && "sm:col-span-2 xl:col-span-1",
            )}
          >
            <Icon className={cn("mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground", missing && "text-warning")} aria-hidden />
            <div className="min-w-0">
              <dt className={cn("font-medium text-muted-foreground", missing && "text-warning")}>{label}</dt>
              <dd
                className={cn(
                  "mt-0.5 font-semibold text-foreground",
                  wide ? "line-clamp-2 break-words" : "truncate",
                  mono && "font-mono text-[11px]",
                  missing && "text-warning",
                )}
              >
                {value}
              </dd>
            </div>
          </div>
        ))}
      </dl>
      )}
    </section>
  )
}
