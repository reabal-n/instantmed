import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  FileText,
  Mail,
  MapPin,
  Phone,
  Stethoscope,
  User,
} from "lucide-react"
import Link from "next/link"
import { notFound } from "next/navigation"

import { DashboardCard, DashboardPageHeader, StatusBadge } from "@/components/dashboard"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { requireRole } from "@/lib/auth/helpers"
import { getIntakeWithDetails, getPatientIntakes } from "@/lib/data/intakes"
import { getCertDeliveryStatus } from "@/lib/data/issued-certificates"
import { calculateAge, formatCurrency, formatDateLong, formatDateTime } from "@/lib/format"
import { formatIntakeStatus, formatServiceType } from "@/lib/format/intake"
import type { IntakeWithPatient } from "@/types/db"

export const metadata = { title: "Admin Intake Detail" }

export const dynamic = "force-dynamic"

function statusTone(status: string): "success" | "warning" | "error" | "info" | "neutral" {
  if (["approved", "completed"].includes(status)) return "success"
  if (["paid", "in_review", "awaiting_script", "pending_info"].includes(status)) return "warning"
  if (["declined", "refunded", "checkout_failed", "expired", "cancelled"].includes(status)) return "error"
  if (["pending_payment"].includes(status)) return "info"
  return "neutral"
}

function valueOrMissing(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return "Not provided"
  return String(value)
}

function formatAddress(patient: {
  address_line1?: string | null
  suburb?: string | null
  state?: string | null
  postcode?: string | null
}): string {
  return [patient.address_line1, patient.suburb, patient.state, patient.postcode]
    .filter(Boolean)
    .join(", ") || "Not provided"
}

function formatAnswerValue(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null
  if (typeof value === "boolean") return value ? "Yes" : "No"
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : null
  if (typeof value === "string") return value
  if (Array.isArray(value)) {
    const values = value
      .map((item) => formatAnswerValue(item))
      .filter((item): item is string => Boolean(item))
    return values.length > 0 ? values.join(", ") : null
  }
  if (typeof value === "object") {
    return Object.entries(value as Record<string, unknown>)
      .map(([key, nestedValue]) => {
        const formatted = formatAnswerValue(nestedValue)
        return formatted ? `${key.replace(/_/g, " ")}: ${formatted}` : null
      })
      .filter((item): item is string => Boolean(item))
      .join("; ") || null
  }
  return String(value)
}

function formatAnswerLabel(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function previousIntakeHref(intake: IntakeWithPatient): string {
  return `/admin/intakes/${intake.id}`
}

export default async function AdminIntakeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await requireRole(["admin"], { redirectTo: "/admin" })
  const { id } = await params

  const intake = await getIntakeWithDetails(id)
  if (!intake) notFound()

  const [{ data: patientHistory }, certDelivery] = await Promise.all([
    getPatientIntakes(intake.patient.id, { pageSize: 6 }),
    getCertDeliveryStatus(id),
  ])
  const previousIntakes = patientHistory
    .filter((row: { id: string }) => row.id !== id)
    .slice(0, 5)
  const service = intake.service as { name?: string; short_name?: string; type?: string } | undefined
  const patientAge = calculateAge(intake.patient.date_of_birth)
  const answerEntries = Object.entries((intake.answers?.answers ?? {}) as Record<string, unknown>)
    .map(([key, value]) => [key, formatAnswerValue(value)] as const)
    .filter((entry): entry is readonly [string, string] => Boolean(entry[1]))
    .slice(0, 14)

  const timeline = [
    ["Submitted", intake.submitted_at || intake.created_at],
    ["Paid", intake.paid_at],
    ["Review started", intake.review_started_at],
    ["Reviewed", intake.reviewed_at],
    ["Approved", intake.approved_at],
    ["Declined", intake.declined_at],
    ["Script sent", intake.script_sent_at || intake.prescription_sent_at],
    ["Completed", intake.completed_at],
  ].filter(([, date]) => Boolean(date)) as Array<[string, string]>

  return (
    <div className="space-y-6">
      <DashboardPageHeader
        title={intake.reference_number ? `Intake ${intake.reference_number}` : "Intake detail"}
        description={`${intake.patient.full_name || "Patient"} · ${service?.name || formatServiceType(service?.type || intake.category || "request")}`}
        backHref="/admin#intakes"
        backLabel="Admin dashboard"
        badge={<StatusBadge status={statusTone(intake.status)}>{formatIntakeStatus(intake.status)}</StatusBadge>}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" asChild>
              <Link href={`/admin/patients/${intake.patient.id}`}>Patient record</Link>
            </Button>
            <Button asChild>
              <Link href={`/doctor/intakes/${intake.id}`}>
                Switch to doctor mode
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-4">
        <DashboardCard>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Status</p>
          <p className="mt-2 text-2xl font-semibold">{formatIntakeStatus(intake.status)}</p>
        </DashboardCard>
        <DashboardCard>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Payment</p>
          <p className="mt-2 text-2xl font-semibold">{valueOrMissing(intake.payment_status)}</p>
          {typeof intake.amount_cents === "number" && (
            <p className="text-sm text-muted-foreground">{formatCurrency(intake.amount_cents)}</p>
          )}
        </DashboardCard>
        <DashboardCard>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Risk</p>
          <p className="mt-2 text-2xl font-semibold capitalize">{valueOrMissing(intake.risk_tier)}</p>
          {intake.requires_live_consult && (
            <p className="text-sm text-warning">Live consult required</p>
          )}
        </DashboardCard>
        <DashboardCard>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Prescription</p>
          <p className="mt-2 text-2xl font-semibold">{intake.script_sent ? "Sent" : "Not sent"}</p>
          {intake.parchment_reference && (
            <p className="font-mono text-sm text-muted-foreground">{intake.parchment_reference}</p>
          )}
        </DashboardCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_0.9fr]">
        <DashboardCard className="space-y-4">
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Patient</h2>
          </div>
          <div>
            <p className="text-2xl font-semibold">{intake.patient.full_name}</p>
            <p className="text-muted-foreground">
              {patientAge !== null ? `${patientAge}y` : "Age N/A"} · {valueOrMissing(intake.patient.date_of_birth)}
            </p>
          </div>
          <div className="grid gap-3 text-sm sm:grid-cols-2">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Mail className="h-4 w-4" />
              <span className="truncate">{valueOrMissing(intake.patient.email)}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Phone className="h-4 w-4" />
              <span>{valueOrMissing(intake.patient.phone)}</span>
            </div>
            <div className="flex items-start gap-2 text-muted-foreground sm:col-span-2">
              <MapPin className="mt-0.5 h-4 w-4" />
              <span>{formatAddress(intake.patient)}</span>
            </div>
          </div>
          <div className="rounded-xl border border-border/60 bg-muted/30 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Medicare</p>
            <p className="mt-1 font-mono text-lg">{valueOrMissing(intake.patient.medicare_number)}</p>
            <p className="text-sm text-muted-foreground">IRN {valueOrMissing(intake.patient.medicare_irn)}</p>
          </div>
        </DashboardCard>

        <DashboardCard className="space-y-4">
          <div className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Operational timeline</h2>
          </div>
          <div className="space-y-3">
            {timeline.map(([label, date]) => (
              <div key={label} className="flex items-start justify-between gap-4 border-b border-border/50 pb-2 last:border-0 last:pb-0">
                <span className="text-sm text-muted-foreground">{label}</span>
                <span className="text-right text-sm font-medium">{formatDateTime(date)}</span>
              </div>
            ))}
          </div>
          {certDelivery && (
            <div className="rounded-xl border border-border/60 bg-muted/30 p-3">
              <p className="text-sm font-semibold">Certificate delivery</p>
              <p className="text-sm text-muted-foreground">
                {certDelivery.emailOpenedAt
                  ? `Opened ${formatDateTime(certDelivery.emailOpenedAt)}`
                  : certDelivery.emailFailedAt
                    ? `Failed ${formatDateTime(certDelivery.emailFailedAt)}`
                    : certDelivery.emailSentAt
                      ? `Sent ${formatDateTime(certDelivery.emailSentAt)}`
                      : "Pending"}
              </p>
            </div>
          )}
        </DashboardCard>
      </div>

      <DashboardCard className="space-y-4">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Request answers</h2>
        </div>
        {answerEntries.length > 0 ? (
          <dl className="grid gap-3 md:grid-cols-2">
            {answerEntries.map(([key, value]) => (
              <div key={key} className="rounded-xl border border-border/60 bg-muted/20 p-3">
                <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {formatAnswerLabel(key)}
                </dt>
                <dd className="mt-1 text-sm">{value}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="text-sm text-muted-foreground">No intake answers were recorded.</p>
        )}
      </DashboardCard>

      <div className="grid gap-4 lg:grid-cols-2">
        <DashboardCard className="space-y-4">
          <div className="flex items-center gap-2">
            <Stethoscope className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Clinical notes</h2>
          </div>
          {intake.doctor_notes ? (
            <p className="whitespace-pre-wrap text-sm">{intake.doctor_notes}</p>
          ) : (
            <p className="text-sm text-muted-foreground">No clinical note saved yet.</p>
          )}
          {intake.admin_notes && (
            <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Admin note</p>
              <p className="mt-1 whitespace-pre-wrap text-sm">{intake.admin_notes}</p>
            </div>
          )}
        </DashboardCard>

        <DashboardCard className="space-y-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning" />
            <h2 className="text-lg font-semibold">Flags and history</h2>
          </div>
          {intake.risk_reasons.length > 0 || intake.risk_flags.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {[...intake.risk_reasons, ...intake.risk_flags].slice(0, 10).map((flag, index) => (
                <Badge key={`${String(flag)}-${index}`} variant="outline">
                  {String(flag)}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No risk flags recorded.</p>
          )}
          {previousIntakes.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Previous requests</p>
              {previousIntakes.map((previous) => {
                const previousService = previous.service as { short_name?: string } | undefined
                return (
                  <Link
                    key={previous.id}
                    href={previousIntakeHref(previous)}
                    className="flex items-center justify-between rounded-xl border border-border/60 px-3 py-2 text-sm transition-colors hover:bg-muted/40"
                  >
                    <span>{previousService?.short_name || "Request"}</span>
                    <span className="text-muted-foreground">{formatDateLong(previous.created_at)}</span>
                  </Link>
                )
              })}
            </div>
          )}
        </DashboardCard>
      </div>

      <DashboardCard className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-semibold">Need to make a clinical decision?</p>
          <p className="text-sm text-muted-foreground">
            Approvals, declines, certificates, and prescribing stay in Doctor mode.
          </p>
        </div>
        <Button asChild>
          <Link href={`/doctor/intakes/${intake.id}`}>
            Continue as doctor
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </DashboardCard>
    </div>
  )
}
