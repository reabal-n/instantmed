import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"

import { getPatientPrescriptions } from "@/lib/parchment/client"
import type { ParchmentPrescription } from "@/lib/parchment/types"

type PrescriptionStatus = "active" | "completed" | "cancelled" | "expired"

interface SyncParchmentPrescriptionInput {
  supabase: SupabaseClient
  userId: string
  parchmentPatientId: string
  patientProfileId: string
  prescriberProfileId: string | null
  intakeId?: string | null
  scid: string
}

export interface SyncParchmentPrescriptionResult {
  success: boolean
  prescriptionId?: string
  reason?: string
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

export async function syncParchmentPrescriptionToPms(
  input: SyncParchmentPrescriptionInput,
): Promise<SyncParchmentPrescriptionResult> {
  const response = await getPatientPrescriptions({
    userId: input.userId,
    patientId: input.parchmentPatientId,
    limit: 20,
  })

  const prescription = response.prescriptions.find((candidate) => candidate.scid === input.scid)
  if (!prescription) {
    return { success: false, reason: "prescription_not_found" }
  }

  const record = prescription as Record<string, unknown>
  const quantity = parseInteger(prescription.quantity)
  const repeats = parseInteger(prescription.number_of_repeats_authorised)
  const issuedDate = toDateOnly(prescription.created_date) ?? new Date().toISOString().slice(0, 10)
  const expiryDate = toDateOnly(getStringField(record, ["expiry_date", "expires_at", "valid_until"]))

  const { data, error } = await input.supabase
    .from("prescriptions")
    .upsert({
      patient_id: input.patientProfileId,
      prescriber_id: input.prescriberProfileId,
      intake_id: input.intakeId ?? null,
      medication_name: buildMedicationName(prescription, input.scid),
      medication_strength: prescription.item_strength ?? null,
      dosage_instructions: prescription.patient_instructions ?? null,
      quantity_prescribed: quantity,
      repeats_allowed: repeats ?? 0,
      status: mapStatus(prescription.status),
      issued_date: issuedDate,
      expiry_date: expiryDate,
      notes: prescription.doctor_notes ?? null,
      parchment_reference: input.scid,
      parchment_url: prescription.url ?? null,
      updated_at: new Date().toISOString(),
    }, { onConflict: "parchment_reference" })
    .select("id")
    .maybeSingle()

  if (error) {
    return { success: false, reason: error.message || "prescription_upsert_failed" }
  }

  return { success: true, prescriptionId: data?.id as string | undefined }
}
