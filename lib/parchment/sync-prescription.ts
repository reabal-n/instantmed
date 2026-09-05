import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"

import { getPatientPrescriptions } from "@/lib/parchment/client"
import type { ParchmentPrescription } from "@/lib/parchment/types"

type PrescriptionStatus = "active" | "completed" | "cancelled" | "expired"

interface BasePrescriptionSyncInput {
  supabase: SupabaseClient
  patientProfileId: string
  prescriberProfileId: string | null
  intakeId?: string | null
  overwriteNullableLinks?: boolean
}

interface SyncParchmentPrescriptionInput extends BasePrescriptionSyncInput {
  userId: string
  parchmentPatientId: string
  scid: string
}

export interface SyncParchmentPrescriptionResult {
  success: boolean
  prescriptionId?: string
  reason?: string
}

export interface SyncParchmentPrescriptionListInput extends BasePrescriptionSyncInput {
  userId: string
  parchmentPatientId: string
  limit?: number
}

export interface SyncParchmentPrescriptionListResult {
  success: boolean
  syncedCount: number
  failedCount: number
  requestId?: string
  errors: Array<{ scid: string; reason: string }>
}

function parseInteger(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === "") return null
  const parsed = Number.parseInt(String(value), 10)
  return Number.isFinite(parsed) ? parsed : null
}

function toDateOnly(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.toISOString().slice(0, 10)
}

function mapStatus(status: string | undefined): PrescriptionStatus {
  const normalized = status?.toLowerCase()
  if (normalized === "completed" || normalized === "dispensed") return "completed"
  if (normalized === "cancelled" || normalized === "canceled") return "cancelled"
  if (normalized === "expired") return "expired"
  return "active"
}

function getStringField(record: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === "string" && value.trim()) return value
  }
  return null
}

function buildMedicationName(prescription: ParchmentPrescription, scid: string): string {
  return prescription.item_name?.trim()
    || [prescription.item_strength, prescription.item_form].filter(Boolean).join(" ").trim()
    || `Parchment prescription ${scid}`
}

function shouldSkipExternalParchmentReadForE2E(): boolean {
  const isDeployedRuntime = process.env.NODE_ENV === "production"
    || process.env.VERCEL === "1"
    || Boolean(process.env.VERCEL_ENV)

  return process.env.PLAYWRIGHT === "1" && !isDeployedRuntime
}

async function upsertParchmentPrescriptionToPms(
  input: BasePrescriptionSyncInput,
  prescription: ParchmentPrescription,
): Promise<SyncParchmentPrescriptionResult> {
  const scid = prescription.scid
  const record = prescription as Record<string, unknown>
  const quantity = parseInteger(prescription.quantity)
  const repeats = parseInteger(prescription.number_of_repeats_authorised)
  const issuedDate = toDateOnly(prescription.created_date) ?? new Date().toISOString().slice(0, 10)
  const expiryDate = toDateOnly(getStringField(record, ["expiry_date", "expires_at", "valid_until"]))
  const overwriteNullableLinks = input.overwriteNullableLinks === true

  const payload: Record<string, unknown> = {
    patient_id: input.patientProfileId,
    medication_name: buildMedicationName(prescription, scid),
    medication_strength: prescription.item_strength ?? null,
    dosage_instructions: prescription.patient_instructions ?? null,
    quantity_prescribed: quantity,
    repeats_allowed: repeats ?? 0,
    status: mapStatus(prescription.status),
    issued_date: issuedDate,
    expiry_date: expiryDate,
    notes: prescription.doctor_notes ?? null,
    parchment_reference: scid,
    parchment_url: prescription.url ?? null,
    updated_at: new Date().toISOString(),
  }

  if (overwriteNullableLinks || input.prescriberProfileId) {
    payload.prescriber_id = input.prescriberProfileId ?? null
  }

  if (overwriteNullableLinks || input.intakeId) {
    payload.intake_id = input.intakeId ?? null
  }

  const { data: inserted, error: insertError } = await input.supabase
    .from("prescriptions")
    .upsert({
      ...payload,
      prescriber_id: input.prescriberProfileId ?? null,
      intake_id: input.intakeId ?? null,
    }, { onConflict: "parchment_reference", ignoreDuplicates: true })
    .select("id")
    .maybeSingle()

  if (insertError) {
    return { success: false, reason: insertError.message || "prescription_upsert_failed" }
  }
  if (inserted) return { success: true, prescriptionId: inserted.id as string }

  // Refreshes and retries must not move a prescription between local profiles
  // sharing one external patient, or erase its verified request/prescriber.
  const { data: existing, error: lookupError } = await input.supabase
    .from("prescriptions")
    .select("id, patient_id, intake_id, prescriber_id")
    .eq("parchment_reference", scid)
    .maybeSingle()

  if (lookupError || !existing) return { success: false, reason: "prescription_lookup_failed" }
  if (existing.patient_id !== input.patientProfileId) {
    return { success: false, reason: "prescription_patient_mismatch" }
  }
  if (input.intakeId && existing.intake_id && existing.intake_id !== input.intakeId) {
    return { success: false, reason: "prescription_request_mismatch" }
  }
  if (input.prescriberProfileId && existing.prescriber_id && existing.prescriber_id !== input.prescriberProfileId) {
    return { success: false, reason: "prescription_prescriber_mismatch" }
  }

  delete payload.patient_id
  delete payload.parchment_reference
  if (!overwriteNullableLinks && existing.prescriber_id) delete payload.prescriber_id
  if (!overwriteNullableLinks && existing.intake_id) delete payload.intake_id

  let update = input.supabase.from("prescriptions").update(payload)
    .eq("id", existing.id)
    .eq("patient_id", input.patientProfileId)
  // Compare the links as well, so a simultaneous webhook/refresh cannot
  // overwrite an association recorded after the read above.
  update = existing.intake_id
    ? update.eq("intake_id", existing.intake_id)
    : update.is("intake_id", null)
  update = existing.prescriber_id
    ? update.eq("prescriber_id", existing.prescriber_id)
    : update.is("prescriber_id", null)
  const { data, error } = await update.select("id").maybeSingle()

  return error || !data
    ? { success: false, reason: "prescription_update_failed" }
    : { success: true, prescriptionId: data.id as string }
}

export async function syncParchmentPrescriptionToPms(
  input: SyncParchmentPrescriptionInput,
): Promise<SyncParchmentPrescriptionResult> {
  if (shouldSkipExternalParchmentReadForE2E()) {
    return { success: false, reason: "e2e_prescription_sync_skipped" }
  }

  const seenCursors = new Set<string>()
  let lastKey: string | undefined
  // Bound provider work while allowing recovery of older prescriptions.
  for (let page = 0; page < 10; page++) {
    const response = await getPatientPrescriptions({
      userId: input.userId,
      patientId: input.parchmentPatientId,
      limit: 50,
      ...(lastKey ? { lastKey } : {}),
    })
    const prescription = response.prescriptions.find((candidate) => candidate.scid === input.scid)
    if (prescription) return upsertParchmentPrescriptionToPms(input, prescription)
    if (!response.pagination?.hasNext) {
      return { success: false, reason: "prescription_not_found" }
    }
    const nextKey = response.pagination.lastKey
    if (!nextKey || seenCursors.has(nextKey)) {
      return { success: false, reason: "prescription_pagination_failed" }
    }
    seenCursors.add(nextKey)
    lastKey = nextKey
  }
  return { success: false, reason: "prescription_search_limit_reached" }
}

export async function syncParchmentPrescriptionListToPms(
  input: SyncParchmentPrescriptionListInput,
): Promise<SyncParchmentPrescriptionListResult> {
  if (shouldSkipExternalParchmentReadForE2E()) {
    return {
      success: false,
      syncedCount: 0,
      failedCount: 0,
      errors: [{ scid: "e2e", reason: "e2e_prescription_sync_skipped" }],
    }
  }

  const response = await getPatientPrescriptions({
    userId: input.userId,
    patientId: input.parchmentPatientId,
    limit: input.limit ?? 20,
  })

  const errors: Array<{ scid: string; reason: string }> = []
  let syncedCount = 0

  for (const prescription of response.prescriptions) {
    const result = await upsertParchmentPrescriptionToPms(input, prescription)
    if (result.success) {
      syncedCount += 1
    } else {
      errors.push({
        scid: prescription.scid,
        reason: result.reason || "prescription_upsert_failed",
      })
    }
  }

  return {
    success: errors.length === 0,
    syncedCount,
    failedCount: errors.length,
    requestId: response.requestId,
    errors,
  }
}
