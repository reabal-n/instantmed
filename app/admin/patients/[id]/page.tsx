import {
  ArrowRight,
  Clock,
  Mail,
  MapPin,
  Phone,
  Pill,
  User,
  Webhook,
} from "lucide-react"
import Link from "next/link"
import { notFound, redirect } from "next/navigation"

import { DashboardCard, StatusBadge } from "@/components/dashboard"
import { PatientTimeline } from "@/components/doctor/patient-timeline"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { requireRole } from "@/lib/auth/helpers"
import { decryptProfilePhi } from "@/lib/data/profiles"
import { calculateAge, formatDateLong, formatDateTime } from "@/lib/format"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { formatRepeatScriptMedicationCompactLabel } from "@/lib/validation/repeat-script-medications"
import { asProfile, type Profile } from "@/types/db"

export const metadata = { title: "Admin Patient Detail" }

export const dynamic = "force-dynamic"

type ServiceJoin = { name: string | null; short_name: string | null; type: string | null } | null

type AdminPatientIntake = {
  id: string
  status: string
  category: string | null
  subtype: string | null
  payment_status: string | null
  created_at: string
  paid_at: string | null
  reviewed_at: string | null
  approved_at: string | null
  declined_at: string | null
  script_sent: boolean | null
  parchment_reference: string | null
  service: ServiceJoin
}

type AdminPrescription = {
  id: string
  medication_name: string
  medication_strength: string | null
  dosage_instructions: string | null
  quantity_prescribed: number | null
  repeats_allowed: number | null
  status: string | null
  issued_date: string | null
  parchment_reference: string | null
  intake_id: string | null
  created_at: string
}

type AdminPatientNote = {
  id: string
  content: string
  note_type: string
  created_by_name: string | null
  created_at: string
}

type AdminEmailLog = {
  id: string
  email_type: string
  subject: string | null
  status: string
  delivery_status: string | null
  sent_at: string | null
  created_at: string
}

type AdminAuditLog = {
  id: string
  action: string
  intake_id: string | null
  metadata: Record<string, unknown> | null
  created_at: string
}

function valueOrMissing(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return "Not provided"
  return String(value)
}

function statusTone(status: string | null | undefined): "success" | "warning" | "error" | "info" | "neutral" {
  if (!status) return "neutral"
  if (["approved", "completed", "sent", "delivered", "success", "active"].includes(status)) return "success"
  if (["paid", "in_review", "awaiting_script", "pending_info", "queued", "pending"].includes(status)) return "warning"
  if (["declined", "failed", "bounced", "refunded", "expired", "cancelled"].includes(status)) return "error"
  if (["opened", "processing"].includes(status)) return "info"
  return "neutral"
}

function formatAddress(patient: Profile): string {
  return [patient.address_line1, patient.suburb, patient.state, patient.postcode]
    .filter(Boolean)
    .join(", ") || "Not provided"
}

function profileCompleteness(patient: Profile): { label: string; tone: "success" | "warning" | "error" } {
  const missing = [
    !patient.full_name && "name",
    !patient.date_of_birth && "date of birth",
    !patient.email && "email",
    !patient.phone && "phone",
    !patient.medicare_number && "Medicare",
  ].filter(Boolean)

  if (missing.length === 0) return { label: "Complete", tone: "success" }
  if (missing.length <= 2) return { label: `Missing ${missing.join(", ")}`, tone: "warning" }
  return { label: "Incomplete identity", tone: "error" }
}

function latestDate(...dates: Array<string | null | undefined>): string | null {
  const timestamps = dates
    .filter((date): date is string => Boolean(date))
    .map((date) => new Date(date).getTime())
    .filter(Number.isFinite)
  if (timestamps.length === 0) return null
  return new Date(Math.max(...timestamps)).toISOString()
}

function formatPrescriptionLabel(prescription: AdminPrescription): string {
  return formatRepeatScriptMedicationCompactLabel({
    name: prescription.medication_name,
    displayName: prescription.medication_name,
    strength: prescription.medication_strength ?? undefined,
  })
}

async function loadAdminPatientDetail(patientId: string) {
  const supabase = createServiceRoleClient()

  const { data: patient, error: patientError } = await supabase
    .from("profiles")
    .select(`
      id, auth_user_id, email, full_name, first_name, last_name,
      date_of_birth, date_of_birth_encrypted, role, phone, phone_encrypted,
      sex, address_line1, suburb, state, postcode,
      medicare_number, medicare_number_encrypted, medicare_irn, medicare_expiry,
      onboarding_completed, email_verified, email_verified_at,
      parchment_patient_id, merged_into_profile_id, merged_at, merged_by, merge_reason,
      created_at, updated_at
    `)
    .eq("id", patientId)
    .eq("role", "patient")
    .maybeSingle()

  if (patientError || !patient) return null
  if (patient.merged_into_profile_id) redirect(`/admin/patients/${patient.merged_into_profile_id}`)

  const decryptedPatient = asProfile(decryptProfilePhi(patient as Record<string, unknown>))

  const [intakesResult, prescriptionsResult, notesResult, emailResult] = await Promise.all([
    supabase
      .from("intakes")
      .select(`
        id,
        status,
        category,
        subtype,
        payment_status,
        created_at,
        paid_at,
        reviewed_at,
        approved_at,
        declined_at,
        script_sent,
        parchment_reference,
        service:services(name, short_name, type)
      `)
      .eq("patient_id", patientId)
      .order("created_at", { ascending: false })
      .limit(25),
    supabase
      .from("prescriptions")
      .select(`
        id,
        medication_name,
        medication_strength,
        dosage_instructions,
        quantity_prescribed,
        repeats_allowed,
        status,
        issued_date,
        parchment_reference,
        intake_id,
        created_at
      `)
      .eq("patient_id", patientId)
      .order("issued_date", { ascending: false })
      .limit(12),
    supabase
      .from("patient_notes")
      .select("id, note_type, content, created_by_name, created_at")
      .eq("patient_id", patientId)
      .order("created_at", { ascending: false })
      .limit(8),
    supabase
      .from("email_outbox")
      .select("id, email_type, subject, status, delivery_status, sent_at, created_at")
      .eq("patient_id", patientId)
      .order("created_at", { ascending: false })
      .limit(8),
  ])

  const intakes = ((intakesResult.data ?? []) as Array<AdminPatientIntake & { service: ServiceJoin | ServiceJoin[] }>)
    .map((intake) => ({
      ...intake,
      service: Array.isArray(intake.service) ? intake.service[0] ?? null : intake.service,
    }))
  const intakeIds = intakes.map((intake) => intake.id)
  let auditRows: AdminAuditLog[] = []

  if (intakeIds.length > 0) {
    const { data } = await supabase
      .from("audit_logs")
      .select("id, action, intake_id, metadata, created_at")
      .in("intake_id", intakeIds)
      .in("action", ["webhook_received", "webhook_processed", "webhook_failed", "admin_action"])
      .order("created_at", { ascending: false })
      .limit(10)
    auditRows = (data ?? []) as AdminAuditLog[]
  }

  return {
    patient: decryptedPatient,
    intakes,
    prescriptions: (prescriptionsResult.data ?? []) as AdminPrescription[],
    notes: (notesResult.data ?? []) as AdminPatientNote[],
    emailLogs: (emailResult.data ?? []) as AdminEmailLog[],
    auditRows,
  }
}

export default async function AdminPatientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await requireRole(["admin"], { redirectTo: "/admin" })
  const { id } = await params
  const data = await loadAdminPatientDetail(id)

  if (!data) notFound()

  const { patient, intakes, prescriptions, notes, emailLogs, auditRows } = data
  const completeness = profileCompleteness(patient)
  const patientAge = calculateAge(patient.date_of_birth)
  const latestPrescription = prescriptions[0]
  const latestActivity = latestDate(
    intakes[0]?.created_at,
    latestPrescription?.issued_date || latestPrescription?.created_at,
    notes[0]?.created_at,
    emailLogs[0]?.sent_at || emailLogs[0]?.created_at,
  )
  const approvedCount = intakes.filter((intake) => ["approved", "completed"].includes(intake.status)).length

  return (
    <div className="flex flex-col gap-3 lg:h-[calc(100vh-4rem)] lg:min-h-0 lg:overflow-hidden">
      <div
        className="shrink-0 rounded-xl border border-border/50 bg-white px-4 py-3 shadow-sm shadow-primary/[0.04] dark:bg-card dark:shadow-none"
        data-testid="operator-action-rail"
      >
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="min-w-0">
            <Button variant="ghost" size="sm" asChild className="-ml-2 mb-1 text-muted-foreground">
              <Link href="/admin#intakes">Back to work</Link>
            </Button>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-2xl font-semibold tracking-tight text-foreground">
                {patient.full_name || "Patient detail"}
              </h1>
              <StatusBadge status={completeness.tone}>{completeness.label}</StatusBadge>
              <Badge variant={patient.parchment_patient_id ? "success" : "warning"} size="sm">
                {patient.parchment_patient_id ? "Parchment synced" : "Parchment pending"}
              </Badge>
            </div>
            <p className="mt-1 truncate text-sm text-muted-foreground">
              {patientAge !== null ? `${patientAge}y` : "Age N/A"} | {valueOrMissing(patient.date_of_birth)} | {formatAddress(patient)}
            </p>
          </div>

          <div className="flex shrink-0 flex-wrap gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/admin/ops/patient-merge-audit">Merge audit</Link>
            </Button>
            <Button size="sm" asChild>
              <Link href={`/doctor/patients/${patient.id}`}>
                Open clinical file
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>

        <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-lg border border-border/50 bg-muted/20 px-3 py-2">
            <p className="text-xs text-muted-foreground">Requests</p>
            <p className="font-semibold tabular-nums text-foreground">{intakes.length} total, {approvedCount} approved</p>
          </div>
          <div className="rounded-lg border border-border/50 bg-muted/20 px-3 py-2">
            <p className="text-xs text-muted-foreground">Prescriptions</p>
            <p className="truncate font-semibold text-foreground">
              {latestPrescription ? formatPrescriptionLabel(latestPrescription) : "None recorded"}
            </p>
          </div>
          <div className="rounded-lg border border-border/50 bg-muted/20 px-3 py-2">
            <p className="text-xs text-muted-foreground">Latest activity</p>
            <p className="font-semibold text-foreground">{latestActivity ? formatDateLong(latestActivity) : "No activity"}</p>
          </div>
          <div className="rounded-lg border border-border/50 bg-muted/20 px-3 py-2">
            <p className="text-xs text-muted-foreground">Parchment patient</p>
            <p className="truncate font-mono text-xs font-semibold text-foreground">
              {patient.parchment_patient_id || "Not synced"}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-3 lg:min-h-0 lg:grid-cols-[minmax(0,1fr)_minmax(360px,0.78fr)] lg:overflow-hidden">
        <div className="space-y-3 lg:min-h-0 lg:overflow-y-auto lg:pr-1">
          <DashboardCard padding="md" className="space-y-3">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-primary" />
              <h2 className="text-base font-semibold">Identity and contact</h2>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-lg bg-muted/30 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Prescribing identity</p>
                <p className="mt-1 font-semibold text-foreground">{valueOrMissing(patient.full_name)}</p>
                <p className="text-sm text-muted-foreground">{valueOrMissing(patient.sex)} | {valueOrMissing(patient.date_of_birth)}</p>
                <p className="mt-2 font-mono text-sm text-foreground">{valueOrMissing(patient.medicare_number)}</p>
                <p className="text-xs text-muted-foreground">IRN {valueOrMissing(patient.medicare_irn)}</p>
              </div>
              <div className="space-y-2 rounded-lg bg-muted/30 p-3 text-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Contact</p>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="truncate">{valueOrMissing(patient.email)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{valueOrMissing(patient.phone)}</span>
                </div>
                <div className="flex items-start gap-2">
                  <MapPin className="mt-0.5 h-4 w-4 text-muted-foreground" />
                  <span>{formatAddress(patient)}</span>
                </div>
              </div>
            </div>
          </DashboardCard>

          <PatientTimeline
            requests={intakes}
            notes={notes}
            admin
            maxItems={12}
            title="Patient timeline"
            emptyLabel="No requests or staff notes recorded yet."
          />
        </div>

        <div className="space-y-3 lg:min-h-0 lg:overflow-y-auto lg:pl-1">
          <DashboardCard padding="md" className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Pill className="h-4 w-4 text-primary" />
                <h2 className="text-base font-semibold">Prescriptions</h2>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link href={`/doctor/patients/${patient.id}`}>Clinical file</Link>
              </Button>
            </div>
            {prescriptions.length > 0 ? (
              <div className="space-y-2">
                {prescriptions.map((prescription) => (
                  <div key={prescription.id} className="rounded-lg border border-border/60 bg-muted/20 p-3 text-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-foreground">{formatPrescriptionLabel(prescription)}</p>
                        {prescription.dosage_instructions && (
                          <p className="mt-1 text-muted-foreground">{prescription.dosage_instructions}</p>
                        )}
                        <p className="mt-2 font-mono text-xs text-muted-foreground">
                          Qty {valueOrMissing(prescription.quantity_prescribed)} | Repeats {valueOrMissing(prescription.repeats_allowed)}
                          {prescription.parchment_reference ? ` | SCID ${prescription.parchment_reference}` : ""}
                        </p>
                      </div>
                      <StatusBadge status={statusTone(prescription.status)} size="sm">
                        {valueOrMissing(prescription.status)}
                      </StatusBadge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No prescriptions recorded yet.</p>
            )}
          </DashboardCard>

          <DashboardCard padding="md" className="space-y-3">
            <div className="flex items-center gap-2">
              <Webhook className="h-4 w-4 text-primary" />
              <h2 className="text-base font-semibold">Audit evidence</h2>
            </div>
            {auditRows.length > 0 ? (
              <div className="space-y-2">
                {auditRows.map((row) => (
                  <div key={row.id} className="rounded-lg border border-border/60 px-3 py-2 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <p className="truncate font-semibold text-foreground">{row.action.replace(/_/g, " ")}</p>
                      <span className="shrink-0 text-xs text-muted-foreground">{formatDateTime(row.created_at)}</span>
                    </div>
                    {row.intake_id && (
                      <Link href={`/admin/intakes/${row.intake_id}`} className="text-xs text-primary hover:underline">
                        Open intake
                      </Link>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No webhook or audit evidence attached yet.</p>
            )}
          </DashboardCard>

          <DashboardCard padding="md" className="space-y-3">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              <h2 className="text-base font-semibold">Notes and emails</h2>
            </div>
            {notes.length > 0 || emailLogs.length > 0 ? (
              <div className="space-y-2">
                {notes.slice(0, 3).map((note) => (
                  <div key={note.id} className="rounded-lg border border-border/60 bg-muted/20 p-3 text-sm">
                    <p className="font-semibold text-foreground">{note.note_type}</p>
                    <p className="mt-1 line-clamp-2 text-muted-foreground">{note.content}</p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {note.created_by_name || "InstantMed"} | {formatDateTime(note.created_at)}
                    </p>
                  </div>
                ))}
                {emailLogs.slice(0, 4).map((email) => (
                  <div key={email.id} className="flex items-center justify-between gap-3 rounded-lg border border-border/60 px-3 py-2 text-sm">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-foreground">{email.subject || email.email_type}</p>
                      <p className="text-xs text-muted-foreground">{formatDateTime(email.sent_at || email.created_at)}</p>
                    </div>
                    <StatusBadge status={statusTone(email.delivery_status || email.status)} size="sm">
                      {email.delivery_status || email.status}
                    </StatusBadge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No notes or emails recorded yet.</p>
            )}
          </DashboardCard>
        </div>
      </div>
    </div>
  )
}
