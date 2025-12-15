"use server"

import { revalidatePath } from "next/cache"
import { requireAuth } from "@/lib/auth"
import { updatePathologyDraftData, getDraftById, createGeneratedDocument, hasDocumentForRequest } from "../../../../../lib/data/documents"
import { updateRequestStatus } from "@/lib/data/requests"
import { RequestLifecycleError, canDoctorApprove } from "../../../../../lib/data/request-lifecycle"
import { createClient } from "@/lib/supabase/server"
import {
  generatePathologyReferralPdfFromDraft,
  testApiTemplateConnection,
  type PathologyDraftData,
  type PathologySubtype,
} from "@/lib/documents/apitemplate"
import type { RequestStatus, PaymentStatus } from "@/types/db"

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

export async function savePathologyDraftAction(
  draftId: string,
  data: PathologyDraftData,
  subtype: PathologySubtype,
): Promise<{ success: boolean; error?: string }> {
  try {
    const { profile } = await requireAuth("doctor")
    if (!profile) {
      return { success: false, error: "Unauthorized" }
    }

    const updatedDraft = await updatePathologyDraftData(draftId, data, subtype)

    if (!updatedDraft) {
      return { success: false, error: "Failed to save draft" }
    }

    return { success: true }
  } catch (error) {
    console.error("Error saving pathology draft:", error)
    return { success: false, error: "An unexpected error occurred" }
  }
}

export async function generatePathologyPdfAndApproveAction(
  draftId: string,
  data: PathologyDraftData,
  subtype: PathologySubtype,
): Promise<{ success: boolean; pdfUrl?: string; error?: string; code?: string }> {
  try {
    // Validate input
    if (!isValidUUID(draftId)) {
      console.error("[generatePathologyPdfAndApproveAction] Invalid draftId:", draftId)
      return { success: false, error: "Invalid draft ID" }
    }

    const { profile } = await requireAuth("doctor")
    if (!profile) {
      return { success: false, error: "Unauthorized" }
    }

    // First save the latest data with subtype
    const savedDraft = await updatePathologyDraftData(draftId, data, subtype)
    if (!savedDraft) {
      return { success: false, error: "Failed to save draft data" }
    }

    // Get the draft to get request_id
    const draft = await getDraftById(draftId)
    if (!draft) {
      return { success: false, error: "Draft not found" }
    }

    // LIFECYCLE CHECK: Verify request can be approved BEFORE generating PDF
    const approvalCheck = await verifyCanApprove(draft.request_id)
    if (!approvalCheck.canApprove) {
      console.error("[generatePathologyPdfAndApproveAction] Approval blocked:", {
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
      pdfUrl = await generatePathologyReferralPdfFromDraft(subtype, data, draft.request_id)
      console.log("[generatePathologyPdfAndApproveAction] PDF generated and stored:", {
        requestId: draft.request_id,
        isPermanent: pdfUrl.includes('/storage/v1/object/public/'),
      })
    } catch (pdfError) {
      console.error("[generatePathologyPdfAndApproveAction] PDF generation error:", pdfError)
      const errorMessage = pdfError instanceof Error ? pdfError.message : "Failed to generate PDF"
      return { success: false, error: errorMessage }
    }

    // Create document record with verification
    const document = await createGeneratedDocument(draft.request_id, "referral", subtype, pdfUrl)

    if (!document) {
      console.error("[generatePathologyPdfAndApproveAction] Failed to save document record")
      return { success: false, error: "PDF generated but failed to save document record" }
    }

    // INVARIANT CHECK: Verify document was actually persisted before approving
    const documentExists = await hasDocumentForRequest(draft.request_id)
    if (!documentExists) {
      console.error("[generatePathologyPdfAndApproveAction] INVARIANT VIOLATION: Document not found after creation")
      return { success: false, error: "Document verification failed - please try again" }
    }

    // Update request status to approved - pass doctor ID for audit
    let updatedRequest
    try {
      updatedRequest = await updateRequestStatus(draft.request_id, "approved", profile.id)
    } catch (lifecycleError) {
      if (lifecycleError instanceof RequestLifecycleError) {
        console.error("[generatePathologyPdfAndApproveAction] Lifecycle error:", lifecycleError.message)
        return { 
          success: false, 
          error: lifecycleError.message,
          code: lifecycleError.code 
        }
      }
      throw lifecycleError
    }

    if (!updatedRequest) {
      console.error("[generatePathologyPdfAndApproveAction] Failed to update request status")
      return { success: false, error: "PDF generated but failed to update request status" }
    }

    console.log("[generatePathologyPdfAndApproveAction] Request approved:", {
      requestId: draft.request_id,
      doctorId: profile.id,
    })

    // Revalidate paths
    revalidatePath(`/doctor/requests/${draft.request_id}`)
    revalidatePath(`/doctor/requests/${draft.request_id}/pathology-document`)
    revalidatePath("/doctor")
    revalidatePath("/doctor/admin")

    return { success: true, pdfUrl }
  } catch (error) {
    console.error("[generatePathologyPdfAndApproveAction] Unexpected error:", error)
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

export async function approvePathologyWithoutPdfAction(
  requestId: string,
): Promise<{ success: boolean; error?: string; code?: string }> {
  try {
    // Validate input
    if (!isValidUUID(requestId)) {
      console.error("[approvePathologyWithoutPdfAction] Invalid requestId:", requestId)
      return { success: false, error: "Invalid request ID" }
    }

    const { profile } = await requireAuth("doctor")
    if (!profile) {
      return { success: false, error: "Unauthorized" }
    }

    // LIFECYCLE CHECK: Verify request can be approved
    const approvalCheck = await verifyCanApprove(requestId)
    if (!approvalCheck.canApprove) {
      console.error("[approvePathologyWithoutPdfAction] Approval blocked:", {
        requestId,
        reason: approvalCheck.error,
      })
      return { 
        success: false, 
        error: approvalCheck.error || "Cannot approve this request",
        code: "LIFECYCLE_ERROR" 
      }
    }

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

    console.log("[approvePathologyWithoutPdfAction] Request approved:", {
      requestId,
      doctorId: profile.id,
    })

    revalidatePath(`/doctor/requests/${requestId}`)
    revalidatePath("/doctor")
    revalidatePath("/doctor/admin")

    return { success: true }
  } catch (error) {
    console.error("[approvePathologyWithoutPdfAction] Unexpected error:", error)
    return { success: false, error: "An unexpected error occurred" }
  }
}
