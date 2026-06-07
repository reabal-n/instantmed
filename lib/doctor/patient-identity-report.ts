import { decryptProfilePhi } from "@/lib/data/profiles"
import { filterSeededE2EIntakes } from "@/lib/data/seeded-e2e-data"
import {
  PARCHMENT_PATIENT_SYNC_STATUSES,
  PARCHMENT_PRESCRIBING_CONSULT_SUBTYPES,
} from "@/lib/doctor/parchment-claim"
import {
  type DuplicatePatientProfilesSummary,
  summarizeDuplicatePatientProfiles,
} from "@/lib/doctor/patient-snapshot"
import {
  buildPrescribingIdentityBlockerReport,
  type PrescribingIdentityBlockerReport,
  type PrescribingIdentityIntakeRow,
} from "@/lib/doctor/prescribing-identity-blockers"
import { readAnswers } from "@/lib/security/phi-field-wrappers"
import type { createServiceRoleClient } from "@/lib/supabase/service-role"
import { asProfile } from "@/types/db"

type ServiceRoleClient = ReturnType<typeof createServiceRoleClient>

export async function getDuplicatePatientProfileSummary(
  supabase: ServiceRoleClient,
): Promise<DuplicatePatientProfilesSummary> {
  const { data, error } = await supabase
    .from("profiles")
    .select(`
      id, email, full_name, date_of_birth, date_of_birth_encrypted,
      phone, phone_encrypted, role, merged_into_profile_id, created_at, updated_at
    `)
    .eq("role", "patient")
    .is("merged_into_profile_id", null)

  if (error) {
    return {
      rawProfileCount: 0,
      uniqueProfileCount: 0,
      duplicateProfileCount: 0,
      duplicateGroupCount: 0,
    }
  }

  const patients = (data || []).map(row => asProfile(decryptProfilePhi(row as Record<string, unknown>)))
  return summarizeDuplicatePatientProfiles(patients)
}

type PrescribingIdentityDbRow = {
  id: string
  reference_number: string | null
  status: string
  category: string | null
  subtype: string | null
  created_at: string
  paid_at: string | null
  patient: Record<string, unknown> | Record<string, unknown>[] | null
  intake_answers?: Array<{
    answers: Record<string, unknown> | null
    answers_encrypted?: never
  }> | {
    answers: Record<string, unknown> | null
    answers_encrypted?: never
  } | null
}

function firstRelated<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null
  return Array.isArray(value) ? value[0] ?? null : value
}

export async function getPrescribingIdentityBlockerReport(
  supabase: ServiceRoleClient,
): Promise<PrescribingIdentityBlockerReport> {
  const prescribingConsultSubtypeFilter = PARCHMENT_PRESCRIBING_CONSULT_SUBTYPES.join(",")
  const { data, error } = await filterSeededE2EIntakes(
    supabase
      .from("intakes")
      .select(`
      id,
      reference_number,
      status,
      category,
      subtype,
      created_at,
      paid_at,
      patient:profiles!patient_id (
        id, email, full_name, date_of_birth, date_of_birth_encrypted,
        sex, phone, phone_encrypted,
        medicare_number, medicare_number_encrypted, medicare_irn, medicare_expiry,
        ihi_number, ihi_number_encrypted,
        address_line1, suburb, state, postcode,
        parchment_patient_id
      ),
      intake_answers (
        answers,
        answers_encrypted
      )
    `)
      .eq("payment_status", "paid")
      .or(`category.eq.prescription,and(category.eq.consult,subtype.in.(${prescribingConsultSubtypeFilter}))`)
      .in("status", [...PARCHMENT_PATIENT_SYNC_STATUSES])
      .order("paid_at", { ascending: true, nullsFirst: false })
      .limit(100),
  )

  if (error || !data) {
    return buildPrescribingIdentityBlockerReport([])
  }

  // Decrypt the up-to-100 rows CONCURRENTLY rather than serially. The serial
  // `for...await` made the dashboard layout block first paint while it decrypted
  // every intake's answers one at a time just to compute a single nav badge.
  const rows = (
    await Promise.all(
      (data as PrescribingIdentityDbRow[]).map(async (row): Promise<PrescribingIdentityIntakeRow | null> => {
        const patient = firstRelated(row.patient)
        if (!patient) return null

        const answerRow = firstRelated(row.intake_answers)
        const answers = answerRow
          ? await readAnswers({
              answers: answerRow.answers,
              answers_enc: answerRow.answers_encrypted,
            })
          : null

        return {
          id: row.id,
          reference_number: row.reference_number,
          status: row.status,
          category: row.category,
          subtype: row.subtype,
          created_at: row.created_at,
          paid_at: row.paid_at,
          patient: asProfile(decryptProfilePhi(patient)),
          answers,
        }
      }),
    )
  ).filter((r): r is PrescribingIdentityIntakeRow => r !== null)

  return buildPrescribingIdentityBlockerReport(rows)
}
