import { notFound, redirect } from "next/navigation"

import { requireRole } from "@/lib/auth/helpers"
import { decryptProfilePhi } from "@/lib/data/profiles"
import { collapseDuplicatePatientProfiles } from "@/lib/doctor/patient-snapshot"
import { logger } from "@/lib/observability/logger"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { asProfile } from "@/types/db"

import { PatientDetailClient } from "./patient-detail-client"

interface PageProps {
  params: Promise<{ id: string }>
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

  const [intakesResult, certsResult, emailResult, notesResult] = await Promise.all([
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
        service:services(name, short_name, type)
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
  ])

  const { data: intakes, error: intakesError } = intakesResult
  const { count: certificatesCount } = certsResult
  const { data: emailLogs, error: emailError } = emailResult
  const { data: patientNotes, error: notesError } = notesResult

  if (intakesError) {
    logger.error("Error fetching intakes", { patientId }, intakesError)
  }
  if (emailError) {
    logger.error("Error fetching email logs", { patientId }, emailError)
  }
  if (notesError && !["42P01", "42703"].includes(notesError.code)) {
    logger.error("Error fetching patient notes", { patientId }, notesError)
  }

  // Transform intakes to flatten the service relation (Supabase returns array for joins)
  const transformedIntakes = (intakes || []).map(intake => ({
    ...intake,
    service: Array.isArray(intake.service) ? intake.service[0] || null : intake.service,
  }))

  return {
    patient: canonicalPatient,
    intakes: transformedIntakes,
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
  const data = await getPatientWithHistory(id)

  if (!data) {
    notFound()
  }

  return (
    <PatientDetailClient 
      patient={data.patient} 
      intakes={data.intakes} 
      stats={data.stats}
      emailLogs={data.emailLogs}
      patientNotes={data.patientNotes}
      canMergePatientProfiles={authResult.profile.role === "admin"}
    />
  )
}
