"use client"

import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Calendar,
  Phone,
  MapPin,
  CreditCard,
  FileText,
  User,
  Clock,
  CheckCircle,
  XCircle,
  Mail,
} from "lucide-react"
import { ClinicalSummary } from "@/components/doctor/clinical-summary"
import { formatIntakeStatus, formatServiceType } from "@/lib/format-intake"
import { formatDateLong, formatDate } from "@/lib/format"
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
  patientAge,
  maskedMedicare,
  previousIntakes,
  hasRedFlags,
  redFlagDetails,
}: IntakeDetailAnswersProps) {
  const service = intake.service as { name?: string; type?: string; short_name?: string } | undefined
  const answers = intake.answers?.answers || {}

  return (
    <>
      {/* Patient Info Card */}
      <Card>
        <CardHeader className="py-3 px-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <User className="h-4 w-4" />
            Patient Information
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 py-3">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Name</p>
              <p className="font-medium">{intake.patient.full_name}</p>
            </div>
            <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg">
              <Calendar className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground mb-1">Age / DOB</p>
                <p className="font-medium">{patientAge != null ? `${patientAge}y` : "N/A"} • {intake.patient.date_of_birth ? formatDate(intake.patient.date_of_birth) : "Not provided"}</p>
              </div>
            </div>
            <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg">
              <CreditCard className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground mb-1">Medicare</p>
                <p className="font-medium font-mono">{maskedMedicare}</p>
              </div>
            </div>
            <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg">
              <Phone className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground mb-1">Phone</p>
                <p className="font-medium">{intake.patient.phone || "Not provided"}</p>
              </div>
            </div>
            <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg">
              <Mail className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground mb-1">Email</p>
                <p className="font-medium text-sm truncate">{intake.patient.email || "Not provided"}</p>
              </div>
            </div>
            <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg">
              <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground mb-1">Location</p>
                <p className="font-medium">
                  {intake.patient.suburb || "N/A"}, {intake.patient.state || ""}
                </p>
              </div>
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
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              Submitted: {formatDateLong(intake.created_at)}
            </div>
            {intake.paid_at && (
              <div className="flex items-center gap-1">
                <CheckCircle className="h-4 w-4 text-success" />
                Paid: {formatDateLong(intake.paid_at)}
              </div>
            )}
          </div>

          {/* P1 DOCTOR_WORKLOAD_AUDIT: Structured clinical summary instead of raw JSON */}
          {Object.keys(answers).length > 0 && (
            <ClinicalSummary
              answers={answers}
              consultSubtype={intake.category === 'consult' && intake.subtype ? intake.subtype : undefined}
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
                    className="flex items-center justify-between p-2 bg-muted/50 rounded hover:bg-muted transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{prevService?.short_name || "Request"}</span>
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

      {/* Safety Flags — informational only (auto-approve already validated eligibility) */}
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
