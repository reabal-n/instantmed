import { notFound, redirect } from "next/navigation"

import { requireRole } from "@/lib/auth/helpers"
import { decryptProfilePhi } from "@/lib/data/profiles"
import { collapseDuplicatePatientProfiles } from "@/lib/doctor/patient-snapshot"
import { getFeatureFlags } from "@/lib/feature-flags"
import { logger } from "@/lib/observability/logger"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { extractMedicationFromAnswers } from "@/lib/validation/repeat-script-schema"
import { asProfile } from "@/types/db"

import { PatientDetailClient } from "./patient-detail-client"

interface PageProps {
  params: Promise<{ id: string }>
}

interface MedicationHistoryItem {
  id: string
  source: "parchment" | "instantmed_request"
  medication_name: string
  medication_strength: string | null
  dosage_instructions: string | null
  quantity_prescribed: number | null
  repeats_allowed: number | null
  status: string
  recorded_at: string
  parchment_reference: string | null
  request_id: string | null
}

interface ParchmentActivityItem {
  id: string
  status: "success" | "warning" | "destructive" | "info"
  label: string
  detail: string
  occurred_at: string
  event_id: string | null
  scid: string | null
  request_id: string | null
}

type IntakeAnswerJoin = { answers: Record<string, unknown> } | Array<{ answers: Record<string, unknown> }> | null
type AuditLogRow = {
  id: string
  action: string
  actor_type: string | null
  intake_id: string | null
  metadata: Record<string, unknown> | null
  created_at: string
}

function firstStringAnswer(answers: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = answers[key]
    if (typeof value === "string" && value.trim()) return value.trim()
    if (typeof value === "number" && Number.isFinite(value)) return String(value)
  }
  return null
}

function getJoinedAnswers(value: IntakeAnswerJoin | undefined): Record<string, unknown> {
  if (Array.isArray(value)) return value[0]?.answers ?? {}
  return value?.answers ?? {}
}

function buildRequestedMedicationHistory(intakes: Array<Record<string, unknown>>): MedicationHistoryItem[] {
  return intakes
    .map((intake) => {
      const answers = getJoinedAnswers(intake.answers as IntakeAnswerJoin | undefined)
      const extracted = extractMedicationFromAnswers(answers)
      const medicationName = extracted?.medication_display
        || extracted?.medication_name
        || firstStringAnswer(answers, ["medication_display", "medication_name", "medicationName", "selected_medication_name"])

      if (!medicationName) return null

      const item: MedicationHistoryItem = {
        id: `request-${String(intake.id)}`,
        source: "instantmed_request",
        medication_name: medicationName,
        medication_strength: extracted?.medication_strength
          || firstStringAnswer(answers, ["medication_strength", "medicationStrength", "strength"]),
        dosage_instructions: firstStringAnswer(answers, ["current_dose", "currentDose", "dosage_instructions", "dosageInstructions"]),
        quantity_prescribed: null,
        repeats_allowed: null,
        status: typeof intake.status === "string" ? intake.status : "requested",
        recorded_at: firstStringAnswer(intake, ["paid_at", "created_at"]) || new Date(0).toISOString(),
        parchment_reference: typeof intake.parchment_reference === "string" ? intake.parchment_reference : null,
        request_id: typeof intake.id === "string" ? intake.id : null,
      }
      return item
    })
    .filter((item): item is MedicationHistoryItem => item !== null)
}

function metadataString(metadata: Record<string, unknown> | null, keys: string[]): string | null {
  if (!metadata) return null
  for (const key of keys) {
    const value = metadata[key]
    if (typeof value === "string" && value.trim()) return value.trim()
    if (typeof value === "number" && Number.isFinite(value)) return String(value)
    if (typeof value === "boolean") return value ? "true" : "false"
  }
  return null
}

function metadataNumber(metadata: Record<string, unknown> | null, key: string): number | null {
  const value = metadata?.[key]
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

function mapParchmentAuditActivity(row: AuditLogRow): ParchmentActivityItem | null {
  const metadata = row.metadata
  const actionType = metadataString(metadata, ["action_type"])
  const eventType = metadataString(metadata, ["eventType", "event_type"])
  const eventId = metadataString(metadata, ["event_id", "eventId"])
  const scid = metadataString(metadata, ["scid", "parchmentReference", "parchment_reference"])

  if (row.action === "webhook_failed") {
    const error = metadataString(metadata, ["error", "reason"]) || "processing failed"
    return {
      id: `audit-${row.id}`,
      status: "destructive",
      label: "Webhook failed",
      detail: `Parchment sent prescription.created, but InstantMed could not complete processing: ${error}.`,
      occurred_at: row.created_at,
      event_id: eventId,
      scid,
      request_id: row.intake_id,
    }
  }

  if (actionType === "patient_profile_parchment_prescribe_opened") {
    return {
      id: `audit-${row.id}`,
      status: "info",
      label: "Parchment opened",
      detail: "The embedded prescribing session was opened from this patient file.",
      occurred_at: row.created_at,
      event_id: eventId,
      scid,
      request_id: row.intake_id,
    }
  }

  if (actionType === "patient_profile_parchment_sync") {
    return {
      id: `audit-${row.id}`,
      status: "success",
      label: "Patient synced",
      detail: "InstantMed sent the current patient identity and contact details to Parchment.",
      occurred_at: row.created_at,
      event_id: eventId,
      scid,
      request_id: row.intake_id,
    }
  }

  if (actionType === "patient_profile_parchment_prescriptions_refreshed") {
    const synced = metadataNumber(metadata, "synced_count") ?? 0
    const failed = metadataNumber(metadata, "failed_count") ?? 0
    return {
      id: `audit-${row.id}`,
      status: failed > 0 ? "warning" : "success",
      label: "Prescription refresh",
      detail: `Manual refresh pulled ${synced} Parchment prescription${synced === 1 ? "" : "s"} into InstantMed${failed > 0 ? `; ${failed} failed` : ""}.`,
      occurred_at: row.created_at,
      event_id: eventId,
      scid,
      request_id: row.intake_id,
    }
  }

  if (actionType === "parchment_webhook_script_sent" || actionType === "parchment_webhook_already_processed") {
    return {
      id: `audit-${row.id}`,
      status: "success",
      label: "Webhook confirmed script sent",
      detail: "Parchment sent prescription.created, InstantMed synced the prescription, and the script was marked sent.",
      occurred_at: row.created_at,
      event_id: eventId,
      scid,
      request_id: row.intake_id,
    }
  }

  if (actionType === "parchment_webhook_prescription_synced") {
    return {
      id: `audit-${row.id}`,
      status: "success",
      label: "Webhook synced prescription",
      detail: "Parchment sent prescription.created and InstantMed stored it on this patient profile.",
      occurred_at: row.created_at,
      event_id: eventId,
      scid,
      request_id: row.intake_id,
    }
  }

  if (eventType === "parchment:prescription.created") {
    return {
      id: `audit-${row.id}`,
      status: "info",
      label: "Parchment event recorded",
      detail: "A Parchment prescription event is present in the audit trail.",
      occurred_at: row.created_at,
      event_id: eventId,
      scid,
      request_id: row.intake_id,
    }
  }

  return null
}

function buildParchmentActivityFromRows(
  intakes: Array<Record<string, unknown>>,
  prescriptions: Array<Record<string, unknown>>,
  auditRows: AuditLogRow[],
): ParchmentActivityItem[] {
  const intakeActivity = intakes
    .filter((intake) => intake.script_sent === true && typeof intake.parchment_reference === "string")
    .map((intake) => ({
      id: `intake-${String(intake.id)}-${String(intake.parchment_reference)}`,
      status: "success" as const,
      label: "Script marked sent",
      detail: "InstantMed has the script_sent flag and Parchment reference recorded for this request.",
      occurred_at: typeof intake.script_sent_at === "string"
        ? intake.script_sent_at
        : typeof intake.updated_at === "string"
          ? intake.updated_at
          : typeof intake.created_at === "string"
            ? intake.created_at
            : new Date(0).toISOString(),
      event_id: null,
      scid: String(intake.parchment_reference),
      request_id: typeof intake.id === "string" ? intake.id : null,
    }))

  const prescriptionActivity = prescriptions
    .filter((prescription) => typeof prescription.parchment_reference === "string")
    .slice(0, 1)
    .map((prescription) => ({
      id: `prescription-${String(prescription.id)}`,
      status: "success" as const,
      label: "Prescription in medication history",
      detail: "InstantMed has a synced Parchment prescription record for this patient.",
      occurred_at: typeof prescription.issued_date === "string"
        ? prescription.issued_date
        : typeof prescription.created_at === "string"
          ? prescription.created_at
          : new Date(0).toISOString(),
      event_id: null,
      scid: String(prescription.parchment_reference),
      request_id: typeof prescription.intake_id === "string" ? prescription.intake_id : null,
    }))

  const auditActivity = auditRows
    .map(mapParchmentAuditActivity)
    .filter((item): item is ParchmentActivityItem => item !== null)

  const deduped = new Map<string, ParchmentActivityItem>()
  for (const item of [...auditActivity, ...intakeActivity, ...prescriptionActivity]) {
    const key = `${item.label}:${item.scid || item.event_id || item.id}`
    if (!deduped.has(key)) deduped.set(key, item)
  }

  return Array.from(deduped.values())
    .sort((a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime())
    .slice(0, 8)
}

async function getPatientParchmentAuditRows(
  supabase: ReturnType<typeof createServiceRoleClient>,
  patientIds: string[],
  intakeIds: string[],
): Promise<AuditLogRow[]> {
  const selectColumns = "id, action, actor_type, intake_id, metadata, created_at"
  const queries = [
    supabase
      .from("audit_logs")
      .select(selectColumns)
      .in("metadata->>patient_id", patientIds)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("audit_logs")
      .select(selectColumns)
      .in("metadata->>partner_patient_id", patientIds)
      .order("created_at", { ascending: false })
      .limit(20),
  ]

  if (intakeIds.length > 0) {
    queries.push(
      supabase
        .from("audit_logs")
        .select(selectColumns)
        .in("intake_id", intakeIds)
        .order("created_at", { ascending: false })
        .limit(20),
    )
  }

  const results = await Promise.all(queries)
  const rows = new Map<string, AuditLogRow>()

  for (const result of results) {
    if (result.error) {
      logger.warn("Could not fetch Parchment patient audit rows", { patientIds }, result.error)
      continue
    }
    for (const row of result.data || []) {
      rows.set(row.id, row as AuditLogRow)
    }
  }

  return Array.from(rows.values())
}

async function getPatientWithHistory(patientId: string) {
  const supabase = createServiceRoleClient()

  // Get patient profile
  const { data: patient, error: patientError } = await supabase
    .from("profiles")
    .select(`
      id, auth_user_id, email, full_name, first_name, last_name,
      date_of_birth, date_of_birth_encrypted, role, phone, phone_encrypted,
      sex, address_line1, suburb, state, postcode,
      medicare_number, medicare_number_encrypted, medicare_irn, medicare_expiry,
      ahpra_number, ahpra_verified, ahpra_verified_at, ahpra_verified_by,
      provider_number, consent_myhr, onboarding_completed,
      email_verified, email_verified_at,
      avatar_url, stripe_customer_id, parchment_patient_id,
      merged_into_profile_id, merged_at, merged_by, merge_reason,
      created_at, updated_at
    `)
    .eq("id", patientId)
    .eq("role", "patient")
    .single()

  if (patientError || !patient) {
    return null
  }

  if (patient.merged_into_profile_id) {
    redirect(`/doctor/patients/${patient.merged_into_profile_id}`)
  }

  const decryptedPatient = asProfile(decryptProfilePhi(patient as Record<string, unknown>))
  let patientIds = [patientId]
  let canonicalPatient = decryptedPatient

  const { data: duplicateCandidates, error: duplicateCandidatesError } = await supabase
    .from("profiles")
    .select(`
      id, auth_user_id, email, full_name, first_name, last_name,
      date_of_birth, date_of_birth_encrypted, role, phone, phone_encrypted,
      sex, address_line1, suburb, state, postcode,
      medicare_number, medicare_number_encrypted, medicare_irn, medicare_expiry,
      ahpra_number, ahpra_verified, ahpra_verified_at, ahpra_verified_by,
      provider_number, consent_myhr, onboarding_completed,
      email_verified, email_verified_at,
      avatar_url, stripe_customer_id, parchment_patient_id,
      merged_into_profile_id, merged_at, merged_by, merge_reason,
      created_at, updated_at
    `)
    .eq("role", "patient")
    .is("merged_into_profile_id", null)
    .order("created_at", { ascending: false })

  if (duplicateCandidatesError) {
    logger.warn("Could not fetch duplicate patient candidates", { patientId }, duplicateCandidatesError)
  } else {
    const collapsedProfiles = collapseDuplicatePatientProfiles(
      (duplicateCandidates || []).map(row => asProfile(decryptProfilePhi(row as Record<string, unknown>))),
    )
    const patientGroup = collapsedProfiles.patients.find((profile) => (
      profile.id === patientId || profile.duplicate_profile_ids?.includes(patientId)
    ))

    if (patientGroup) {
      canonicalPatient = patientGroup
      patientIds = [patientGroup.id, ...(patientGroup.duplicate_profile_ids ?? [])]
    }
  }

  const [intakesResult, certsResult, emailResult, notesResult, prescriptionsResult] = await Promise.all([
    supabase
      .from("intakes")
      .select(`
        id,
        status,
        category,
        subtype,
        created_at,
        paid_at,
        reviewed_at,
        reviewed_by,
        payment_status,
        script_sent,
        script_sent_at,
        parchment_reference,
        updated_at,
        service:services(name, short_name, type),
        answers:intake_answers(answers)
      `)
      .in("patient_id", patientIds)
      .order("created_at", { ascending: false })
      .limit(50),

    supabase
      .from("issued_certificates")
      .select("id", { count: "exact", head: true })
      .in("patient_id", patientIds),

    supabase
      .from("email_outbox")
      .select(`
        id,
        email_type,
        to_email,
        subject,
        status,
        delivery_status,
        created_at,
        sent_at,
        intake_id
      `)
      .in("patient_id", patientIds)
      .order("created_at", { ascending: false })
      .limit(20),

    supabase
      .from("patient_notes")
      .select("id, patient_id, note_type, content, created_by, created_by_name, created_at, updated_at")
      .in("patient_id", patientIds)
      .order("created_at", { ascending: false }),

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
        expiry_date,
        parchment_reference,
        parchment_url,
        intake_id,
        created_at
      `)
      .in("patient_id", patientIds)
      .order("issued_date", { ascending: false })
      .limit(20),
  ])

  const { data: intakes, error: intakesError } = intakesResult
  const { count: certificatesCount } = certsResult
  const { data: emailLogs, error: emailError } = emailResult
  const { data: patientNotes, error: notesError } = notesResult
  const { data: prescriptions, error: prescriptionsError } = prescriptionsResult

  if (intakesError) {
    logger.error("Error fetching intakes", { patientId }, intakesError)
  }
  if (emailError) {
    logger.error("Error fetching email logs", { patientId }, emailError)
  }
  if (notesError && !["42P01", "42703"].includes(notesError.code)) {
    logger.error("Error fetching patient notes", { patientId }, notesError)
  }
  if (prescriptionsError) {
    logger.error("Error fetching patient prescriptions", { patientId }, prescriptionsError)
  }

  // Transform intakes to flatten the service relation (Supabase returns array for joins)
  const transformedIntakes = (intakes || []).map(intake => {
    const { answers: _answers, ...intakeWithoutAnswers } = intake
    return {
      ...intakeWithoutAnswers,
      service: Array.isArray(intake.service) ? intake.service[0] || null : intake.service,
    }
  })

  const medicationHistory: MedicationHistoryItem[] = [
    ...(prescriptions || []).map((prescription) => ({
      id: `parchment-${prescription.id}`,
      source: "parchment" as const,
      medication_name: prescription.medication_name,
      medication_strength: prescription.medication_strength,
      dosage_instructions: prescription.dosage_instructions,
      quantity_prescribed: prescription.quantity_prescribed,
      repeats_allowed: prescription.repeats_allowed,
      status: prescription.status,
      recorded_at: prescription.issued_date || prescription.created_at,
      parchment_reference: prescription.parchment_reference,
      request_id: null,
    })),
    ...buildRequestedMedicationHistory((intakes || []) as Array<Record<string, unknown>>),
  ].sort((a, b) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime())
  const intakeIds = (intakes || [])
    .map((intake) => intake.id)
    .filter((id): id is string => typeof id === "string")
  const parchmentAuditRows = await getPatientParchmentAuditRows(supabase, patientIds, intakeIds)
  const parchmentActivity = buildParchmentActivityFromRows(
    (intakes || []) as Array<Record<string, unknown>>,
    (prescriptions || []) as Array<Record<string, unknown>>,
    parchmentAuditRows,
  )

  return {
    patient: canonicalPatient,
    intakes: transformedIntakes,
    medications: medicationHistory,
    parchmentActivity,
    emailLogs: emailLogs || [],
    patientNotes: patientNotes || [],
    stats: {
      totalRequests: intakes?.length || 0,
      approvedRequests: intakes?.filter(i => i.status === "approved" || i.status === "completed").length || 0,
      certificatesIssued: certificatesCount || 0,
      linkedProfiles: patientIds.length,
    }
  }
}

export const metadata = { title: "Patient Detail" }

export const dynamic = "force-dynamic"

export default async function PatientDetailPage({ params }: PageProps) {
  const authResult = await requireRole(["doctor", "admin"], { redirectTo: "/doctor/dashboard" })
  const { id } = await params
  const [data, flags] = await Promise.all([
    getPatientWithHistory(id),
    getFeatureFlags(),
  ])

  if (!data) {
    notFound()
  }

  return (
    <PatientDetailClient 
      patient={data.patient} 
      intakes={data.intakes} 
      medications={data.medications}
      stats={data.stats}
      emailLogs={data.emailLogs}
      patientNotes={data.patientNotes}
      parchmentActivity={data.parchmentActivity}
      canMergePatientProfiles={authResult.profile.role === "admin"}
      parchmentEnabled={flags.parchment_embedded_prescribing}
      parchmentUserLinked={Boolean(authResult.profile.parchment_user_id)}
    />
  )
}
