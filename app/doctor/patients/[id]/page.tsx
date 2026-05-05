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

type IntakeAnswerJoin = { answers: Record<string, unknown> } | Array<{ answers: Record<string, unknown> }> | null

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
        parchment_reference,
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

  return {
    patient: canonicalPatient,
    intakes: transformedIntakes,
    medications: medicationHistory,
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
      canMergePatientProfiles={authResult.profile.role === "admin"}
      parchmentEnabled={flags.parchment_embedded_prescribing}
      parchmentUserLinked={Boolean(authResult.profile.parchment_user_id)}
    />
  )
}
