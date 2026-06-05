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
  const overwriteNullableLinks = input.overwriteNullableLinks !== false

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

  const { data, error } = await input.supabase
    .from("prescriptions")
    .upsert(payload, { onConflict: "parchment_reference" })
    .select("id")
    .maybeSingle()

  if (error) {
    return { success: false, reason: error.message || "prescription_upsert_failed" }
  }

  return { success: true, prescriptionId: data?.id as string | undefined }
}

export async function syncParchmentPrescriptionToPms(
  input: SyncParchmentPrescriptionInput,
): Promise<SyncParchmentPrescriptionResult> {
  if (shouldSkipExternalParchmentReadForE2E()) {
    return { success: false, reason: "e2e_prescription_sync_skipped" }
  }

  const response = await getPatientPrescriptions({
    userId: input.userId,
    patientId: input.parchmentPatientId,
    limit: 20,
  })

  const prescription = response.prescriptions.find((candidate) => candidate.scid === input.scid)
  if (!prescription) {
    return { success: false, reason: "prescription_not_found" }
  }

  return upsertParchmentPrescriptionToPms(input, prescription)
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
