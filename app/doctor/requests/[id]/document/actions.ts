"use server"

import { revalidatePath } from "next/cache"
import { requireAuth } from "../../../../../lib/auth"
import { updateMedCertDraftData, getDraftById, createGeneratedDocument, hasDocumentForRequest } from "../../../../../lib/data/documents"
import { updateRequestStatus, getRequestWithDetails } from "../../../../../lib/data/requests"
import { RequestLifecycleError, canDoctorApprove } from "../../../../../lib/data/request-lifecycle"
import { generateMedCertPdfFromDraft, testApiTemplateConnection } from "../../../../../lib/documents/apitemplate"
import { sendMedCertReadyEmail } from "../../../../../lib/email/resend"
import { getPatientEmailFromRequest } from "../../../../../lib/data/profiles"
import { createClient } from "../../../../../lib/supabase/server"
import type { MedCertDraftData, RequestStatus, PaymentStatus } from "../../../../../types/db"

// UUID validation helper
function isValidUUID(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return uuidRegex.test(id)
}

// Helper to check if doctor can approve this request
async function verifyCanApprove(requestId: string): Promise<{ canApprove: boolean; error?: string }> {
  const supabase = await createClient()
  
  const { data: request, error } = await supabase
    .from("requests")
    .select("status, payment_status")
    .eq("id", requestId)
    .single()

  if (error || !request) {
    return { canApprove: false, error: "Request not found" }
  }

  const validation = canDoctorApprove(
    request.status as RequestStatus,
    request.payment_status as PaymentStatus
  )

  if (!validation.valid) {
    return { canApprove: false, error: validation.error }
  }

  return { canApprove: true }
}

export async function saveMedCertDraftAction(
  draftId: string,
  data: MedCertDraftData,
): Promise<{ success: boolean; error?: string }> {
  try {
    // Validate input
    if (!isValidUUID(draftId)) {
      console.error("[saveMedCertDraftAction] Invalid draftId:", draftId)
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

    console.log("[saveMedCertDraftAction] Draft saved:", { draftId, doctorId: profile.id })
    return { success: true }
  } catch (error) {
    console.error("[saveMedCertDraftAction] Error:", error)
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
      console.error("[generateMedCertPdfAndApproveAction] Invalid draftId:", draftId)
      return { success: false, error: "Invalid draft ID" }
    }

    const { profile } = await requireAuth("doctor")
    if (!profile) {
      return { success: false, error: "Unauthorized" }
    }

    console.log("[generateMedCertPdfAndApproveAction] Starting:", { draftId, doctorId: profile.id })

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

    // LIFECYCLE CHECK: Verify request can be approved BEFORE generating PDF
    const approvalCheck = await verifyCanApprove(draft.request_id)
    if (!approvalCheck.canApprove) {
      console.error("[generateMedCertPdfAndApproveAction] Approval blocked:", {
        requestId: draft.request_id,
        reason: approvalCheck.error,
      })
      return { 
        success: false, 
        error: approvalCheck.error || "Cannot approve this request",
        code: "LIFECYCLE_ERROR" 
      }
    }

    // Generate PDF using APITemplate and upload to permanent storage
    let pdfUrl: string
    try {
      // Pass requestId for permanent storage upload
      pdfUrl = await generateMedCertPdfFromDraft(data, draft.subtype, draft.request_id)
      console.log("[generateMedCertPdfAndApproveAction] PDF generated and stored:", { 
        requestId: draft.request_id,
        isPermanent: pdfUrl.includes('/storage/v1/object/public/'),
      })
    } catch (pdfError) {
      console.error("[generateMedCertPdfAndApproveAction] PDF generation error:", pdfError)
      const errorMessage = pdfError instanceof Error ? pdfError.message : "Failed to generate PDF"
      return { success: false, error: errorMessage }
    }

    // Create document record with correct subtype
    // This also creates the verification record
    const document = await createGeneratedDocument(draft.request_id, draft.type, draft.subtype || "work", pdfUrl)

    if (!document) {
      console.error("[generateMedCertPdfAndApproveAction] Failed to save document record")
      return { success: false, error: "PDF generated but failed to save document record" }
    }

    // INVARIANT CHECK: Verify document was actually persisted before approving
    const documentExists = await hasDocumentForRequest(draft.request_id)
    if (!documentExists) {
      console.error("[generateMedCertPdfAndApproveAction] INVARIANT VIOLATION: Document not found after creation")
      return { success: false, error: "Document verification failed - please try again" }
    }

    // Update request status to approved - pass doctor ID for audit trail
    // This will throw RequestLifecycleError if transition is invalid (double-check)
    let updatedRequest
    try {
      updatedRequest = await updateRequestStatus(draft.request_id, "approved", profile.id)
    } catch (lifecycleError) {
      if (lifecycleError instanceof RequestLifecycleError) {
        console.error("[generateMedCertPdfAndApproveAction] Lifecycle error on status update:", lifecycleError.message)
        return { 
          success: false, 
          error: lifecycleError.message,
          code: lifecycleError.code 
        }
      }
      throw lifecycleError
    }

    if (!updatedRequest) {
      console.error("[generateMedCertPdfAndApproveAction] Failed to update request status")
      return { success: false, error: "PDF generated but failed to update request status" }
    }

    console.log("[generateMedCertPdfAndApproveAction] Request approved:", {
      requestId: draft.request_id,
      doctorId: profile.id,
      doctorName: profile.full_name,
    })

    // Send email notification to patient (fire and forget - don't block on email)
    sendPatientNotificationEmail(draft.request_id, pdfUrl, draft.subtype).catch((error) => {
      console.error("[generateMedCertPdfAndApproveAction] Email send failed:", error)
    })

    // Revalidate paths
    revalidatePath(`/doctor/requests/${draft.request_id}`)
    revalidatePath(`/doctor/requests/${draft.request_id}/document`)
    revalidatePath("/doctor")
    revalidatePath("/doctor/admin")

    return { success: true, pdfUrl }
  } catch (error) {
    console.error("[generateMedCertPdfAndApproveAction] Unexpected error:", error)
    return { success: false, error: "An unexpected error occurred" }
  }
}

export async function testApiConnectionAction(): Promise<{ success: boolean; error?: string }> {
  try {
    const { profile } = await requireAuth("doctor")
    if (!profile) {
      return { success: false, error: "Unauthorized" }
    }

    return await testApiTemplateConnection()
  } catch (error) {
    console.error("Error testing API connection:", error)
    return { success: false, error: "Failed to test connection" }
  }
}

export async function approveWithoutPdfAction(requestId: string): Promise<{ success: boolean; error?: string; code?: string }> {
  try {
    // Validate input
    if (!isValidUUID(requestId)) {
      console.error("[approveWithoutPdfAction] Invalid requestId:", requestId)
      return { success: false, error: "Invalid request ID" }
    }

    const { profile } = await requireAuth("doctor")
    if (!profile) {
      return { success: false, error: "Unauthorized" }
    }

    // LIFECYCLE CHECK: Verify request can be approved
    const approvalCheck = await verifyCanApprove(requestId)
    if (!approvalCheck.canApprove) {
      console.error("[approveWithoutPdfAction] Approval blocked:", {
        requestId,
        reason: approvalCheck.error,
      })
      return { 
        success: false, 
        error: approvalCheck.error || "Cannot approve this request",
        code: "LIFECYCLE_ERROR" 
      }
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

    console.log("[approveWithoutPdfAction] Request approved:", {
      requestId,
      doctorId: profile.id,
      doctorName: profile.full_name,
    })

    revalidatePath(`/doctor/requests/${requestId}`)
    revalidatePath("/doctor")
    revalidatePath("/doctor/admin")

    return { success: true }
  } catch (error) {
    console.error("[approveWithoutPdfAction] Unexpected error:", error)
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
      console.error("[Email] Could not find request or patient for email")
      return
    }

    // Get patient email
    const patientEmail = await getPatientEmailFromRequest(requestId)
    if (!patientEmail) {
      console.error("[Email] Could not find patient email")
      return
    }

    // Send the email
    const result = await sendMedCertReadyEmail({
      to: patientEmail,
      patientName: request.patient.full_name || "there",
      pdfUrl,
      requestId,
      certType: subtype || "work",
    })

    if (!result.success) {
      console.error("[Email] Failed to send med cert ready email:", result.error)
    } else {
      console.log(`[Email] Med cert ready email sent to ${patientEmail}, id: ${result.id}`)
    }
  } catch (error) {
    console.error("[Email] Error sending notification:", error)
  }
}
