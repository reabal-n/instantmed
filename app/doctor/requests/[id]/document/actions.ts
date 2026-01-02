"use server"

import { revalidatePath } from "next/cache"
import { requireAuth } from "../../../../../lib/auth"
import { updateMedCertDraftData, getDraftById, createGeneratedDocument, hasDocumentForRequest } from "../../../../../lib/data/documents"
import { updateRequestStatus, getRequestWithDetails } from "../../../../../lib/data/requests"
import { RequestLifecycleError } from "../../../../../lib/data/request-lifecycle"
import { generateMedCertPdfFactory } from "../../../../../lib/documents/med-cert-pdf-factory"
import { uploadPdfBuffer } from "../../../../../lib/storage/documents"
import { sendMedCertReadyEmail } from "../../../../../lib/email/resend"
import { getPatientEmailFromRequest } from "../../../../../lib/data/profiles"
import { assertApprovalInvariants, ApprovalInvariantError } from "../../../../../lib/approval/med-cert-invariants"
import { logger } from "../../../../../lib/logger"
import type { MedCertDraftData } from "../../../../../types/db"

// UUID validation helper
function isValidUUID(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return uuidRegex.test(id)
}


export async function saveMedCertDraftAction(
  draftId: string,
  data: MedCertDraftData,
): Promise<{ success: boolean; error?: string }> {
  try {
    // Validate input
    if (!isValidUUID(draftId)) {
      return { success: false, error: "Invalid draft ID" }
    }

    const { profile } = await requireAuth("doctor")
    if (!profile) {
      return { success: false, error: "Unauthorized" }
    }

    const updatedDraft = await updateMedCertDraftData(draftId, data)

    if (!updatedDraft) {
      return { success: false, error: "Failed to save draft" }
    }

    return { success: true }
  } catch {
    return { success: false, error: "An unexpected error occurred" }
  }
}

export async function generateMedCertPdfAndApproveAction(
  draftId: string,
  data: MedCertDraftData,
): Promise<{ success: boolean; pdfUrl?: string; error?: string; code?: string }> {
  try {
    // Validate input
    if (!isValidUUID(draftId)) {
      return { success: false, error: "Invalid draft ID" }
    }

    const { profile } = await requireAuth("doctor")
    if (!profile) {
      return { success: false, error: "Unauthorized" }
    }

    // First save the latest data
    const savedDraft = await updateMedCertDraftData(draftId, data)
    if (!savedDraft) {
      return { success: false, error: "Failed to save draft data" }
    }

    // Get the draft to get request_id and subtype
    const draft = await getDraftById(draftId)
    if (!draft) {
      return { success: false, error: "Draft not found" }
    }

    // INVARIANT CHECK: Verify all approval prerequisites BEFORE generating PDF
    try {
      await assertApprovalInvariants(draft.request_id)
    } catch (invariantError) {
      if (invariantError instanceof ApprovalInvariantError) {
        return { 
          success: false, 
          error: invariantError.message,
        }
      }
      throw invariantError
    }

    // Generate PDF and upload to permanent storage using consolidated factory
    let pdfUrl: string
    try {
      // Use consolidated factory that handles logo/signature assets
      const pdfResult = await generateMedCertPdfFactory({
        data,
        subtype: draft.subtype,
        requestId: draft.request_id,
      })
      
      logger.info(`[actions] PDF generated: ${pdfResult.certId} (${pdfResult.size} bytes)`)
      
      // Upload to Supabase Storage
      const uploadResult = await uploadPdfBuffer(
        pdfResult.buffer,
        draft.request_id,
        "med_cert",
        draft.subtype || "work"
      )
      
      if (!uploadResult.success || !uploadResult.permanentUrl) {
        return { success: false, error: uploadResult.error || "Failed to upload PDF" }
      }
      
      pdfUrl = uploadResult.permanentUrl
      logger.info(`[actions] PDF uploaded to ${pdfUrl}`)
    } catch (pdfError) {
      const errorMessage = pdfError instanceof Error ? pdfError.message : "Failed to generate PDF"
      logger.error(`[actions] PDF generation failed: ${errorMessage}`)
      return { success: false, error: errorMessage }
    }

    // Create document record with correct subtype
    // This also creates the verification record
    const document = await createGeneratedDocument(draft.request_id, draft.type, draft.subtype || "work", pdfUrl)

    if (!document) {
      return { success: false, error: "PDF generated but failed to save document record", code: "DOCUMENT_MISSING" }
    }

    // INVARIANT CHECK: Verify document was actually persisted before approving
    const documentExists = await hasDocumentForRequest(draft.request_id)
    if (!documentExists) {
      return { success: false, error: "Document verification failed - please try again", code: "DOCUMENT_MISSING" }
    }

    // Update request status to approved - pass doctor ID for audit trail
    // This will throw RequestLifecycleError if transition is invalid (double-check)
    let updatedRequest
    try {
      updatedRequest = await updateRequestStatus(draft.request_id, "approved", profile.id)
    } catch (lifecycleError) {
      if (lifecycleError instanceof RequestLifecycleError) {
        return { 
          success: false, 
          error: lifecycleError.message,
          code: lifecycleError.code 
        }
      }
      throw lifecycleError
    }

    if (!updatedRequest) {
      return { success: false, error: "PDF generated but failed to update request status" }
    }

    // Send email notification to patient (fire and forget - don't block on email)
    sendPatientNotificationEmail(draft.request_id, pdfUrl, draft.subtype).catch(() => {
      // Email failures are logged in sendPatientNotificationEmail
    })

    // Revalidate paths
    revalidatePath(`/doctor/requests/${draft.request_id}`)
    revalidatePath(`/doctor/requests/${draft.request_id}/document`)
    revalidatePath("/doctor")
    revalidatePath("/doctor/admin")

    return { success: true, pdfUrl }
  } catch {
    return { success: false, error: "An unexpected error occurred" }
  }
}

export async function testPdfGenerationAction(): Promise<{ success: boolean; error?: string }> {
  try {
    const { profile } = await requireAuth("doctor")
    if (!profile) {
      return { success: false, error: "Unauthorized" }
    }

    // Test PDF generation with sample data
    const testData: MedCertDraftData = {
      patient_name: "Test Patient",
      dob: "1990-01-01",
      date_from: new Date().toISOString(),
      date_to: new Date().toISOString(),
      reason: "Test condition",
      work_capacity: "Unable to work",
      doctor_name: "Dr Test",
      provider_number: "1234567X",
      created_date: new Date().toISOString(),
      notes: null,
    }

    const result = await generateMedCertPdfFactory({
      data: testData,
      subtype: "work",
      requestId: "test-request-id",
    })
    
    if (result.buffer && result.buffer.length > 0) {
      return { success: true }
    }
    
    return { success: false, error: "PDF generation returned empty buffer" }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to test PDF generation" }
  }
}

export async function approveWithoutPdfAction(requestId: string): Promise<{ success: boolean; error?: string; code?: string }> {
  try {
    // Validate input
    if (!isValidUUID(requestId)) {
      return { success: false, error: "Invalid request ID" }
    }

    const { profile } = await requireAuth("doctor")
    if (!profile) {
      return { success: false, error: "Unauthorized" }
    }

    // INVARIANT CHECK: Verify all approval prerequisites
    try {
      await assertApprovalInvariants(requestId)
    } catch (invariantError) {
      if (invariantError instanceof ApprovalInvariantError) {
        return { 
          success: false, 
          error: invariantError.message,
        }
      }
      throw invariantError
    }

    // Pass doctor ID for audit trail
    let updatedRequest
    try {
      updatedRequest = await updateRequestStatus(requestId, "approved", profile.id)
    } catch (lifecycleError) {
      if (lifecycleError instanceof RequestLifecycleError) {
        return { 
          success: false, 
          error: lifecycleError.message,
          code: lifecycleError.code 
        }
      }
      throw lifecycleError
    }

    if (!updatedRequest) {
      return { success: false, error: "Failed to update request status" }
    }

    revalidatePath(`/doctor/requests/${requestId}`)
    revalidatePath("/doctor")
    revalidatePath("/doctor/admin")

    return { success: true }
  } catch {
    return { success: false, error: "An unexpected error occurred" }
  }
}

/**
 * Helper function to send email notification to patient after approval
 * This is fire-and-forget to not block the approval flow
 */
async function sendPatientNotificationEmail(
  requestId: string,
  pdfUrl: string,
  subtype: string | null
): Promise<void> {
  try {
    // Get request with patient details
    const request = await getRequestWithDetails(requestId)
    if (!request || !request.patient) {
      return
    }

    // Get patient email
    const patientEmail = await getPatientEmailFromRequest(requestId)
    if (!patientEmail) {
      return
    }

    // Send the email
    await sendMedCertReadyEmail({
      to: patientEmail,
      patientName: request.patient.full_name || "there",
      pdfUrl,
      requestId,
      certType: subtype || "work",
    })
  } catch {
    // Silently fail - email is fire-and-forget
  }
}
