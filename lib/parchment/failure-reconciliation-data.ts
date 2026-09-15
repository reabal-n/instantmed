import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"

import type {
  ParchmentStandaloneFailureCandidate,
  ParchmentStandalonePrescriptionEvidence,
} from "@/lib/parchment/failure-reconciliation"
import { isSyntheticParchmentFailure } from "@/lib/parchment/failure-reconciliation"

export interface ParchmentStandaloneEvidenceRead {
  data: ParchmentStandalonePrescriptionEvidence[]
  error: { message: string } | null
}

interface ParchmentAuditRow {
  id: string
  action: string
  intake_id: string | null
  created_at: string
  description: string | null
  metadata: Record<string, unknown> | null
}

/** Read the monitored window before reconciling or limiting presentation. A
 * failed/capped/changing scan is explicitly unavailable, never an all-clear. */
export async function readParchmentAuditWindow(
  supabase: SupabaseClient,
  kind: "failures" | "retries",
  since: string,
  until: string,
): Promise<{ data: ParchmentAuditRow[]; count: number | null; error: { message: string } | null }> {
  const rows = new Map<string, ParchmentAuditRow>()
  let expectedCount: number | null = null
  const incomplete = () => ({ data: [...rows.values()], count: null, error: { message: "Parchment monitor coverage incomplete" } })
  try {
    for (let offset = 0; offset < 5000; offset += 500) {
      let query = supabase.from("audit_logs")
        .select("id, action, intake_id, created_at, description, metadata", { count: "exact" })
        .eq("action", kind === "failures" ? "webhook_failed" : "admin_action")
        .gte("created_at", since).lte("created_at", until)
      query = kind === "failures"
        ? query.contains("metadata", { eventType: "parchment:prescription.created" })
          .not("metadata", "cs", JSON.stringify({ error: "no_awaiting_script_intake" }))
          .not("metadata", "cs", JSON.stringify({ error: "patient_not_found" }))
          .not("metadata", "cs", JSON.stringify({ parchment_patient_id: "nonexistent-parchment-patient" }))
        : query.contains("metadata", { action_type: "parchment_webhook_retry", result: "success" })
      const result = await query.order("created_at", { ascending: false })
        .order("id", { ascending: false }).range(offset, offset + 499)
      if (result.error || result.count === null || !result.data) return incomplete()
      if (expectedCount !== null && expectedCount !== result.count) return incomplete()
      expectedCount = result.count
      for (const row of result.data) rows.set(row.id, row as ParchmentAuditRow)
      if (rows.size === expectedCount) {
        const data = [...rows.values()].filter(row => kind !== "failures" || !isSyntheticParchmentFailure(row.metadata))
        return { data, count: data.length, error: null }
      }
      if (result.data.length < 500) return incomplete()
    }
  } catch { return incomplete() }
  return incomplete()
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
