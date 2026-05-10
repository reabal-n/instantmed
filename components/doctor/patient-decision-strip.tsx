"use client"

import {
  Calendar,
  CheckCircle2,
  ClipboardCheck,
  CreditCard,
  FileText,
  History,
  MapPin,
  Phone,
  Stethoscope,
  Users,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { buildStaffCaseSummary } from "@/lib/doctor/case-summary"
import { cn } from "@/lib/utils"
import type { IntakeWithDetails, IntakeWithPatient } from "@/types/db"

type StripIntake = IntakeWithDetails | IntakeWithPatient

interface PatientDecisionStripProps {
  intake: StripIntake
  answers?: Record<string, unknown>
  previousIntakes?: IntakeWithPatient[]
  service?: { name?: string; type?: string; short_name?: string }
  doctorNotes?: string | null
  compact?: boolean
  className?: string
}

export function PatientDecisionStrip({
  intake,
  answers = {},
  previousIntakes = [],
  service: serviceProp,
  doctorNotes,
  compact = false,
  className,
}: PatientDecisionStripProps) {
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
    { label: "Sex", value: snapshot.sex.label, icon: Users },
    { label: "Medicare", value: snapshot.medicare.label, icon: CreditCard, mono: snapshot.medicare.present },
    { label: "Phone", value: snapshot.phone.label, icon: Phone },
    { label: "Address", value: snapshot.address.label, icon: MapPin, wide: true },
    { label: "Last request", value: summary.previousLabel, icon: History, wide: true },
  ]

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
          <p className="truncate text-sm font-semibold text-foreground">{summary.patientName}</p>
          <p className="truncate text-xs text-muted-foreground">
            {summary.serviceShortLabel}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge
            variant={snapshot.completenessTone === "complete" ? "success" : snapshot.completenessTone === "partial" ? "warning" : "destructive"}
            size="sm"
            className="shrink-0"
          >
            <ClipboardCheck className="h-3 w-3" />
            {snapshot.completenessTone === "complete" ? "Identity ready" : snapshot.completenessLabel}
          </Badge>
          <Badge variant={summary.notesReady ? "success" : "warning"} size="sm" className="shrink-0">
            <FileText className="h-3 w-3" />
            {summary.notesLabel}
          </Badge>
          <Badge variant="outline" size="sm" className="shrink-0">
            {intake.status === "completed" ? <CheckCircle2 className="h-3 w-3" /> : <Stethoscope className="h-3 w-3" />}
            {summary.actionLabel}
          </Badge>
        </div>
      </div>
      <dl className={cn("mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3", compact && "mt-2")}>
        {fields.map(({ label, value, icon: Icon, mono, wide }) => (
          <div
            key={label}
            className={cn(
              "flex min-w-0 items-start gap-2 rounded-lg bg-card px-2.5 py-2 text-xs ring-1 ring-border/40",
              wide && "sm:col-span-2 xl:col-span-1",
            )}
          >
            <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
            <div className="min-w-0">
              <dt className="font-medium text-muted-foreground">{label}</dt>
              <dd className={cn("mt-0.5 truncate font-semibold text-foreground", mono && "font-mono text-[11px]")}>
                {value}
              </dd>
            </div>
          </div>
        ))}
      </dl>
    </section>
  )
}
