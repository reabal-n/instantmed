import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"

import type {
  ParchmentStandaloneFailureCandidate,
  ParchmentStandalonePrescriptionEvidence,
} from "@/lib/parchment/failure-reconciliation"

export interface ParchmentStandaloneEvidenceRead {
  data: ParchmentStandalonePrescriptionEvidence[]
  error: { message: string } | null
}

/**
 * Fetch only the non-PHI identifiers needed to prove that an invalid legacy
 * correlation was subsequently synced as a standalone prescription. A failed
 * evidence read returns an error so callers can keep the original failure
 * visible rather than accidentally declaring it recovered.
 */
export async function readStandaloneParchmentPrescriptionEvidence(
  supabase: SupabaseClient,
  failures: ParchmentStandaloneFailureCandidate[],
): Promise<ParchmentStandaloneEvidenceRead> {
  const scids = Array.from(new Set(
    failures.flatMap((failure) => (
      failure.reason === "intake_correlation_invalid"
      && !failure.intakeId
      && typeof failure.scid === "string"
      && failure.scid.trim()
        ? [failure.scid.trim()]
        : []
    )),
  ))

  if (scids.length === 0) return { data: [], error: null }

  const result = await supabase
    .from("prescriptions")
    .select("patient_id, intake_id, parchment_reference")
    .in("parchment_reference", scids)
    .is("intake_id", null)

  if (result.error) {
    return {
      data: [],
      error: { message: result.error.message ?? "Unknown prescription evidence query error" },
    }
  }

  return {
    data: (result.data || []).map((row) => ({
      intakeId: row.intake_id,
      parchmentReference: row.parchment_reference,
      patientId: row.patient_id,
    })),
    error: null,
  }
}
