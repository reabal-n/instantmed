"use client"

import {
  AlertTriangle,
  CheckCircle,
  Clock,
  CreditCard,
  FileText,
  Mail,
  MapPin,
  Phone,
  XCircle,
} from "lucide-react"
import Link from "next/link"

import { ClinicalCaseReview } from "@/components/doctor"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { buildPatientSnapshot, getPatientSnapshotOptionsForCase } from "@/lib/doctor/patient-snapshot"
import { formatDate,formatDateLong } from "@/lib/format"
import { formatIntakeStatus, formatServiceType } from "@/lib/format/intake"
import type { IntakeWithDetails, IntakeWithPatient } from "@/types/db"

function formatConsultSubtype(subtype: string): string {
  const labels: Record<string, string> = {
    general: 'General consult',
    new_medication: 'New medication',
    ed: 'Erectile dysfunction',
    hair_loss: 'Hair loss',
    womens_health: "Women's health",
    weight_loss: 'Weight loss',
  }
  return labels[subtype] || subtype.replace(/_/g, ' ')
}

interface IntakeDetailAnswersProps {
  intake: IntakeWithDetails
  patientAge: number | null
  maskedMedicare: string
  previousIntakes: IntakeWithPatient[]
  hasRedFlags: boolean
  redFlagDetails: string[]
}

export function IntakeDetailAnswers({
  intake,
  patientAge: _patientAge,
  maskedMedicare: _maskedMedicare,
  previousIntakes,
  hasRedFlags,
  redFlagDetails,
}: IntakeDetailAnswersProps) {
  const service = intake.service as { name?: string; type?: string; short_name?: string } | undefined
  const answers = intake.answers?.answers || {}
  const snapshot = buildPatientSnapshot(intake.patient, getPatientSnapshotOptionsForCase({
    answers: answers as Record<string, unknown>,
    category: intake.category,
    serviceType: service?.type,
    subtype: intake.subtype,
  }))

  return (
    <>
      {/* Patient Info Card - hierarchical: name anchors the card, Medicare is
          the clinical identifier the doctor scans second, contact info is
          tertiary. Previously all six tiles had identical visual weight which
          forced the doctor's eye to parse each tile independently. */}
      <Card>
        <CardContent className="px-5 py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <h2 className="text-xl font-semibold leading-tight text-foreground">
                  {snapshot.name}
                </h2>
                <span className="text-sm text-muted-foreground">{snapshot.ageDobLabel}</span>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                <Badge
                  variant={snapshot.completenessTone === "complete" ? "success" : snapshot.completenessTone === "partial" ? "warning" : "destructive"}
                  size="sm"
                >
                  {snapshot.completenessTone === "complete" ? "Details complete" : snapshot.completenessLabel}
                </Badge>
              </div>
            </div>
            <Link
              href={snapshot.profileHref}
              className="inline-flex h-9 shrink-0 items-center justify-center rounded-md border border-border bg-white px-3 text-xs font-semibold text-foreground transition-colors hover:bg-muted/50 dark:bg-card"
            >
              Patient profile
            </Link>
          </div>

          {snapshot.missingCriticalFields.length > 0 && (
            <div className="mt-3 rounded-lg border border-warning-border bg-warning-light px-3 py-2 text-sm text-warning">
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{snapshot.completenessLabel}. Confirm before approving if clinically required.</span>
              </div>
            </div>
          )}

          <div className="mt-3 pt-3 border-t border-border/60 flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-xs uppercase tracking-wide text-muted-foreground">Medicare</span>
            <span className="font-mono text-sm text-foreground">{snapshot.medicare.label}</span>
          </div>

          <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-y-1.5 gap-x-6 text-sm">
            <div className="flex items-center gap-2 min-w-0 text-muted-foreground">
              <Mail className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{snapshot.email.label}</span>
            </div>
            <div className="flex items-center gap-2 min-w-0 text-muted-foreground">
              <Phone className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{snapshot.phone.label}</span>
            </div>
            <div className="flex items-center gap-2 min-w-0 text-muted-foreground">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{snapshot.address.label}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Request Info */}
      <Card>
        <CardHeader className="py-3 px-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4" />
            {service?.name || formatServiceType(service?.type || "")}
            {/* Display consult subtype for consult service */}
            {intake.category === 'consult' && intake.subtype && intake.subtype !== 'general' && (
              <Badge variant="secondary" className="ml-2 text-xs font-normal">
                {formatConsultSubtype(intake.subtype)}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 py-3 space-y-3">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4 shrink-0" />
              Submitted: {formatDateLong(intake.created_at)}
            </div>
            {intake.paid_at && (
              <div className="flex items-center gap-1">
                <CheckCircle className="h-4 w-4 text-success shrink-0" />
                Paid: {formatDateLong(intake.paid_at)}
              </div>
            )}
          </div>

          {/* P1 DOCTOR_WORKLOAD_AUDIT: Structured clinical summary instead of raw JSON */}
          {Object.keys(answers).length > 0 && (
            <ClinicalCaseReview
              answers={answers as Record<string, unknown>}
              category={intake.category}
              subtype={intake.subtype}
              serviceType={service?.type}
              patientName={intake.patient.full_name}
              riskTier={intake.risk_tier}
              requiresLiveConsult={intake.requires_live_consult}
              className="border-0 shadow-none p-0"
            />
          )}
        </CardContent>
      </Card>

      {/* Patient History */}
      {previousIntakes.length > 0 && (
        <Card>
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-base">Previous Requests</CardTitle>
          </CardHeader>
          <CardContent className="px-4 py-3">
            <div className="space-y-2">
              {previousIntakes.map((prev) => {
                const prevService = prev.service as { short_name?: string } | undefined
                const hasNotes = Boolean(prev.doctor_notes)
                return (
                  <Link
                    key={prev.id}
                    href={`/doctor/intakes/${prev.id}`}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-2 p-2 bg-muted/50 rounded hover:bg-muted transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-sm truncate">{prevService?.short_name || "Request"}</span>
                      {hasNotes && (
                        <Badge variant="outline" className="text-xs h-4 px-1 bg-info-light text-info border-info-border">
                          <FileText className="h-2.5 w-2.5 mr-0.5" />
                          Note
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {formatIntakeStatus(prev.status)}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(prev.created_at)}
                      </span>
                    </div>
                  </Link>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Safety Flags - informational only (auto-approve already validated eligibility) */}
      {hasRedFlags && (
        <Card className="border-amber-300 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10">
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-amber-700 dark:text-amber-400 flex items-center gap-2 text-base">
              <XCircle className="h-4 w-4" />
              Safety Notes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm space-y-1">
              {redFlagDetails.map((detail, i) => (
                <p key={i} className="text-amber-800 dark:text-amber-300">• {detail}</p>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </>
  )
}
