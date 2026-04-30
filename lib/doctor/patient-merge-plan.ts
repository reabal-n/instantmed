export interface PatientProfileReferenceTable {
  table: string
  column: "patient_id" | "profile_id"
  mergeMode: "reassign"
  required: boolean
}

export interface PatientProfileMergeOperation {
  table: string
  column: "patient_id" | "profile_id"
  fromPatientIds: string[]
  toPatientId: string
}

export interface PatientProfileMergePreflightPlan {
  canonicalPatientId: string
  duplicatePatientIds: string[]
  referenceTables: PatientProfileReferenceTable[]
  updateOperations: PatientProfileMergeOperation[]
}

export const PATIENT_PROFILE_MERGE_REFERENCE_TABLES: PatientProfileReferenceTable[] = [
  { table: "intakes", column: "patient_id", mergeMode: "reassign", required: true },
  { table: "issued_certificates", column: "patient_id", mergeMode: "reassign", required: true },
  { table: "email_outbox", column: "patient_id", mergeMode: "reassign", required: true },
  { table: "patient_notes", column: "patient_id", mergeMode: "reassign", required: true },
  { table: "patient_health_profiles", column: "patient_id", mergeMode: "reassign", required: true },
  { table: "consents", column: "patient_id", mergeMode: "reassign", required: true },
  { table: "patient_consents", column: "patient_id", mergeMode: "reassign", required: false },
  { table: "intake_followups", column: "patient_id", mergeMode: "reassign", required: false },
  { table: "repeat_rx_requests", column: "patient_id", mergeMode: "reassign", required: false },
  { table: "referral_credits", column: "profile_id", mergeMode: "reassign", required: false },
]

export function getPatientProfileMergePreflightPlan(
  canonicalPatientId: string,
  duplicatePatientIds: string[],
): PatientProfileMergePreflightPlan {
  const uniqueDuplicateIds = [...new Set(duplicatePatientIds)].filter(Boolean)

  if (uniqueDuplicateIds.includes(canonicalPatientId)) {
    throw new Error("Duplicate profile list cannot include the canonical profile")
  }

  return {
    canonicalPatientId,
    duplicatePatientIds: uniqueDuplicateIds,
    referenceTables: PATIENT_PROFILE_MERGE_REFERENCE_TABLES,
    updateOperations: PATIENT_PROFILE_MERGE_REFERENCE_TABLES.map((table) => ({
      table: table.table,
      column: table.column,
      fromPatientIds: uniqueDuplicateIds,
      toPatientId: canonicalPatientId,
    })),
  }
}
