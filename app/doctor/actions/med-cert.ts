"use server"

import { revalidatePath } from "next/cache"
import { requireAuth } from "@/lib/auth"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { getIntakeWithDetails } from "@/lib/data/intakes"
import { createLogger } from "@/lib/observability/logger"
const log = createLogger("med-cert")
import type { MedCertDraft } from "@/types/db"

/**
 * Medical Certificate draft actions
 * Doctor-only operations for creating and managing certificate drafts
 */

// UUID validation helper
function isValidUUID(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return uuidRegex.test(id)
}

// Create or fetch existing draft for a request
export async function getOrCreateMedCertDraft(
  requestId: string
): Promise<{ success: boolean; data?: MedCertDraft; error?: string }> {
  try {
    // Verify doctor auth
    const { profile } = await requireAuth("doctor")
    if (!profile) {
      return { success: false, error: "Unauthorized - doctor access required" }
    }

    if (!isValidUUID(requestId)) {
      return { success: false, error: "Invalid request ID" }
    }

    const supabase = createServiceRoleClient()

    // Fetch intake to verify it exists
    const intake = await getIntakeWithDetails(requestId)
    if (!intake) {
      return { success: false, error: "Request not found" }
    }

    const service = intake.service as { type?: string } | undefined
    if (service?.type !== "med_certs") {
      return { success: false, error: "Request is not a medical certificate" }
    }

    // Try to fetch existing draft
    const { data: existingDraft, error: fetchError } = await supabase
      .from("med_cert_drafts")
      .select("*")
      .eq("request_id", requestId)
      .single()

    // If draft exists, return it
    if (!fetchError && existingDraft) {
      return {
        success: true,
        data: existingDraft as MedCertDraft,
      }
    }

    // Create new draft from intake data
    const newDraftData = {
      request_id: requestId,
      patient_full_name: intake.patient.full_name || "",
      patient_dob: intake.patient.date_of_birth || null,
      date_from: new Date().toISOString().split("T")[0],
      date_to: new Date().toISOString().split("T")[0],
      certificate_type: null as "work" | "uni" | "carer" | null,
      reason_summary: null,
      doctor_typed_name: profile.full_name || "Dr [Your Name]",
      doctor_ahpra: profile.ahpra_number || "",
      provider_name: "InstantMed",
      provider_address: "Level 1/457-459 Elizabeth Street, Surry Hills 2010, Sydney, Australia",
      signature_asset_url: null,
      status: "draft" as const,
      issued_at: null,
      issued_by: null,
    }

    const { data: createdDraft, error: createError } = await supabase
      .from("med_cert_drafts")
      .insert([newDraftData])
      .select("*")
      .single()

    if (createError || !createdDraft) {
      log.error("Failed to create med cert draft", { error: createError, requestId })
      return { success: false, error: "Failed to create draft" }
    }

    return {
      success: true,
      data: createdDraft as MedCertDraft,
    }
  } catch (error) {
    log.error("Error in getOrCreateMedCertDraft", { error })
    return { success: false, error: "An unexpected error occurred" }
  }
}

// Save draft changes
export async function saveMedCertDraft(
  draftId: string,
  data: Partial<MedCertDraft>
): Promise<{ success: boolean; error?: string }> {
  try {
    // Verify doctor auth
    const { profile } = await requireAuth("doctor")
    if (!profile) {
      return { success: false, error: "Unauthorized - doctor access required" }
    }

    if (!isValidUUID(draftId)) {
      return { success: false, error: "Invalid draft ID" }
    }

    // Validate required fields
    if (data.date_from && data.date_to && new Date(data.date_from) > new Date(data.date_to)) {
      return { success: false, error: "Date from must be before date to" }
    }

    const supabase = createServiceRoleClient()

    const updateData: Partial<MedCertDraft> = {
      patient_full_name: data.patient_full_name,
      patient_dob: data.patient_dob,
      date_from: data.date_from,
      date_to: data.date_to,
      certificate_type: data.certificate_type,
      reason_summary: data.reason_summary,
      doctor_typed_name: data.doctor_typed_name,
      doctor_ahpra: data.doctor_ahpra,
      provider_name: data.provider_name,
      provider_address: data.provider_address,
      signature_asset_url: data.signature_asset_url,
      updated_at: new Date().toISOString(),
    }

    const { error } = await supabase
      .from("med_cert_drafts")
      .update(updateData)
      .eq("id", draftId)

    if (error) {
      log.error("Failed to save med cert draft", { error, draftId })
      return { success: false, error: "Failed to save draft" }
    }

    return { success: true }
  } catch (error) {
    log.error("Error in saveMedCertDraft", { error })
    return { success: false, error: "An unexpected error occurred" }
  }
}

// Issue (finalize) the certificate
export async function issueMedCertificate(
  requestId: string,
  draftId: string
): Promise<{ success: boolean; pdfUrl?: string; error?: string }> {
  try {
    // Verify doctor auth
    const { profile } = await requireAuth("doctor")
    if (!profile) {
      return { success: false, error: "Unauthorized - doctor access required" }
    }

    if (!isValidUUID(requestId) || !isValidUUID(draftId)) {
      return { success: false, error: "Invalid IDs" }
    }

    const supabase = createServiceRoleClient()

    // Fetch the draft
    const { data: draft, error: draftError } = await supabase
      .from("med_cert_drafts")
      .select("*")
      .eq("id", draftId)
      .eq("request_id", requestId)
      .single()

    if (draftError || !draft) {
      return { success: false, error: "Draft not found" }
    }

    // Validate all required fields are present
    const requiredFields = [
      "patient_full_name",
      "patient_dob",
      "date_from",
      "date_to",
      "certificate_type",
      "reason_summary",
      "doctor_typed_name",
      "doctor_ahpra",
    ]
    const missingFields = requiredFields.filter((field) => !draft[field as keyof MedCertDraft])

    if (missingFields.length > 0) {
      return { success: false, error: `Missing required fields: ${missingFields.join(", ")}` }
    }

    // Call the render function to generate PDF
    try {
      const { getAppUrl } = await import("@/lib/env")
      const baseUrl = getAppUrl()
      const response = await fetch(`${baseUrl}/api/med-cert/render`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId,
          draftId,
          draftData: draft,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json() as { error?: string }
        return { success: false, error: errorData.error || "Failed to generate PDF" }
      }

      const result = await response.json() as { success: boolean; error?: string; pdfUrl?: string }

      if (!result.success) {
        return { success: false, error: result.error || "Failed to generate PDF" }
      }

      // Mark draft as issued
      await supabase
        .from("med_cert_drafts")
        .update({
          status: "issued",
          issued_at: new Date().toISOString(),
          issued_by: profile.id,
        })
        .eq("id", draftId)

      // Also update intake status to approved
      await supabase
        .from("intakes")
        .update({
          status: "approved",
          reviewed_by: profile.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", requestId)

      // Revalidate paths
      revalidatePath(`/doctor/intakes/${requestId}`)
      revalidatePath(`/patient/intakes/${requestId}`)

      return { success: true, pdfUrl: result.pdfUrl }
    } catch (_error) {
      log.error("Failed to generate PDF", { error: _error })
      return { success: false, error: "Failed to generate PDF" }
    }
  } catch (error) {
    log.error("Error in issueMedCertificate", { error })
    return { success: false, error: "An unexpected error occurred" }
  }
}
