import {
  ArrowRight,
  Clock,
  FileText,
  Mail,
  MapPin,
  Phone,
  Pill,
  User,
  Webhook,
} from "lucide-react"
import Link from "next/link"
import { notFound, redirect } from "next/navigation"

import { DashboardCard, DashboardPageHeader, StatusBadge } from "@/components/dashboard"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { requireRole } from "@/lib/auth/helpers"
import { decryptProfilePhi } from "@/lib/data/profiles"
import { calculateAge, formatDateLong, formatDateTime } from "@/lib/format"
import { formatIntakeStatus } from "@/lib/format/intake"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
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
  const scriptCount = prescriptions.length

  return (
    <div className="space-y-6">
      <DashboardPageHeader
        title={patient.full_name || "Patient detail"}
        description={`${patientAge !== null ? `${patientAge}y` : "Age N/A"} · ${valueOrMissing(patient.date_of_birth)} · ${formatAddress(patient)}`}
        backHref="/admin#intakes"
        backLabel="Admin dashboard"
        badge={<StatusBadge status={completeness.tone}>{completeness.label}</StatusBadge>}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" asChild>
              <Link href="/admin/ops/patient-merge-audit">Merge audit</Link>
            </Button>
            <Button asChild>
              <Link href={`/doctor/patients/${patient.id}`}>
                Open doctor file
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-4">
        <DashboardCard>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Requests</p>
          <p className="mt-2 text-2xl font-semibold">{intakes.length}</p>
          <p className="text-sm text-muted-foreground">{approvedCount} approved</p>
        </DashboardCard>
        <DashboardCard>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Prescriptions</p>
          <p className="mt-2 text-2xl font-semibold">{scriptCount}</p>
          <p className="text-sm text-muted-foreground">{latestPrescription?.medication_name || "None recorded"}</p>
        </DashboardCard>
        <DashboardCard>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Parchment</p>
          <p className="mt-2 text-2xl font-semibold">{patient.parchment_patient_id ? "Synced" : "Not synced"}</p>
          {patient.parchment_patient_id && (
            <p className="truncate font-mono text-sm text-muted-foreground">{patient.parchment_patient_id}</p>
          )}
        </DashboardCard>
        <DashboardCard>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Latest activity</p>
          <p className="mt-2 text-lg font-semibold">{latestActivity ? formatDateLong(latestActivity) : "No activity"}</p>
        </DashboardCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_0.85fr]">
        <DashboardCard className="space-y-4">
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Identity</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Name</p>
              <p className="mt-1 text-lg font-semibold">{valueOrMissing(patient.full_name)}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Date of birth</p>
              <p className="mt-1 text-lg font-semibold">{valueOrMissing(patient.date_of_birth)}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Sex</p>
              <p className="mt-1 text-lg font-semibold">{valueOrMissing(patient.sex)}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Medicare</p>
              <p className="mt-1 font-mono text-lg">{valueOrMissing(patient.medicare_number)}</p>
              <p className="text-sm text-muted-foreground">IRN {valueOrMissing(patient.medicare_irn)}</p>
            </div>
          </div>
        </DashboardCard>

        <DashboardCard className="space-y-4">
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Contact</h2>
          </div>
          <div className="space-y-3 text-sm">
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
          <div className="rounded-xl border border-border/60 bg-muted/30 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Joined</p>
            <p className="mt-1 text-sm">{formatDateTime(patient.created_at)}</p>
          </div>
        </DashboardCard>
      </div>

      <DashboardCard className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Requests</h2>
          </div>
          <Badge variant="outline">{intakes.length} total</Badge>
        </div>
        {intakes.length > 0 ? (
          <div className="overflow-hidden rounded-xl border border-border/60">
            {intakes.map((intake) => {
              const service = intake.service
              return (
                <Link
                  key={intake.id}
                  href={`/admin/intakes/${intake.id}`}
                  className="grid gap-2 border-b border-border/60 px-4 py-3 text-sm transition-colors last:border-0 hover:bg-muted/40 md:grid-cols-[1.2fr_0.8fr_0.8fr_auto]"
                >
                  <div>
                    <p className="font-semibold">{service?.short_name || service?.name || intake.category || "Request"}</p>
                    <p className="text-muted-foreground">{formatDateLong(intake.created_at)}</p>
                  </div>
                  <div>
                    <StatusBadge status={statusTone(intake.status)} size="sm">
                      {formatIntakeStatus(intake.status)}
                    </StatusBadge>
                  </div>
                  <div className="text-muted-foreground">{valueOrMissing(intake.payment_status)}</div>
                  <div className="text-right text-primary">Open</div>
                </Link>
              )
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No requests recorded for this patient.</p>
        )}
      </DashboardCard>

      <DashboardCard className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Pill className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Prescriptions</h2>
          </div>
          <Button variant="outline" asChild>
            <Link href={`/doctor/patients/${patient.id}`}>Prescribe as doctor</Link>
          </Button>
        </div>
        {prescriptions.length > 0 ? (
          <div className="space-y-3">
            {prescriptions.map((prescription) => (
              <div key={prescription.id} className="rounded-xl border border-border/60 bg-muted/20 p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="font-semibold">
                      {prescription.medication_name}
                      {prescription.medication_strength ? ` ${prescription.medication_strength}` : ""}
                    </p>
                    {prescription.dosage_instructions && (
                      <p className="text-sm text-muted-foreground">{prescription.dosage_instructions}</p>
                    )}
                    <p className="mt-2 font-mono text-xs text-muted-foreground">
                      Qty {valueOrMissing(prescription.quantity_prescribed)} · Repeats {valueOrMissing(prescription.repeats_allowed)}
                      {prescription.parchment_reference ? ` · SCID ${prescription.parchment_reference}` : ""}
                    </p>
                  </div>
                  <div className="flex flex-col items-start gap-2 sm:items-end">
                    <StatusBadge status={statusTone(prescription.status)} size="sm">
                      {valueOrMissing(prescription.status)}
                    </StatusBadge>
                    <span className="text-xs text-muted-foreground">
                      {formatDateLong(prescription.issued_date || prescription.created_at)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No prescriptions recorded yet.</p>
        )}
      </DashboardCard>

      <div className="grid gap-4 lg:grid-cols-2">
        <DashboardCard className="space-y-4">
          <div className="flex items-center gap-2">
            <Webhook className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Webhook and audit evidence</h2>
          </div>
          {auditRows.length > 0 ? (
            <div className="space-y-2">
              {auditRows.map((row) => (
                <div key={row.id} className="rounded-xl border border-border/60 px-3 py-2 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold">{row.action.replace(/_/g, " ")}</p>
                    <span className="text-xs text-muted-foreground">{formatDateTime(row.created_at)}</span>
                  </div>
                  {row.intake_id && (
                    <Link href={`/admin/intakes/${row.intake_id}`} className="text-xs text-primary hover:underline">
                      Intake {row.intake_id}
                    </Link>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No webhook or audit evidence attached to this patient yet.</p>
          )}
        </DashboardCard>

        <DashboardCard className="space-y-4">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Recent notes and emails</h2>
          </div>
          {notes.length > 0 || emailLogs.length > 0 ? (
            <div className="space-y-3">
              {notes.slice(0, 4).map((note) => (
                <div key={note.id} className="rounded-xl border border-border/60 bg-muted/20 p-3 text-sm">
                  <p className="font-semibold">{note.note_type}</p>
                  <p className="mt-1 text-muted-foreground">{note.content}</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {note.created_by_name || "InstantMed"} · {formatDateTime(note.created_at)}
                  </p>
                </div>
              ))}
              {emailLogs.slice(0, 4).map((email) => (
                <div key={email.id} className="flex items-center justify-between gap-3 rounded-xl border border-border/60 px-3 py-2 text-sm">
                  <div>
                    <p className="font-semibold">{email.subject || email.email_type}</p>
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

      <DashboardCard className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-semibold">Need to prescribe or update clinical history?</p>
          <p className="text-sm text-muted-foreground">
            Use the doctor file for prescribing, clinical notes, and patient-facing actions.
          </p>
        </div>
        <Button asChild>
          <Link href={`/doctor/patients/${patient.id}`}>
            Continue as doctor
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </DashboardCard>
    </div>
  )
}
