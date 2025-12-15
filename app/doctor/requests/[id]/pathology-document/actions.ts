"use server"

import { revalidatePath } from "next/cache"
import { requireAuth } from "@/lib/auth"
import { updatePathologyDraftData, getDraftById, createGeneratedDocument, hasDocumentForRequest } from "../../../../../lib/data/documents"
import { updateRequestStatus } from "@/lib/data/requests"
import { RequestLifecycleError } from "../../../../../lib/data/request-lifecycle"
import { assertApprovalInvariants, ApprovalInvariantError, verifyDocumentUrlIsPermanent } from "../../../../../lib/approval/invariants"
import { isPermanentStorageUrl } from "../../../../../lib/storage/documents"
import {
  generatePathologyReferralPdfFromDraft,
  testApiTemplateConnection,
  type PathologyDraftData,
  type PathologySubtype,
} from "@/lib/documents/apitemplate"

// UUID validation helper
function isValidUUID(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return uuidRegex.test(id)
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

    // INVARIANT CHECK: Verify all approval prerequisites BEFORE generating PDF
    try {
      await assertApprovalInvariants(draft.request_id)
    } catch (invariantError) {
      if (invariantError instanceof ApprovalInvariantError) {
        console.error("[generatePathologyPdfAndApproveAction] Invariant check failed:", {
          requestId: draft.request_id,
          code: invariantError.code,
          errors: invariantError.details,
        })
        return { 
          success: false, 
          error: invariantError.message,
          code: invariantError.code 
        }
      }
      throw invariantError
    }

    // Generate PDF using APITemplate and upload to permanent storage
    let pdfUrl: string
    try {
      // Pass requestId for permanent storage upload
      pdfUrl = await generatePathologyReferralPdfFromDraft(subtype, data, draft.request_id)
      console.log("[generatePathologyPdfAndApproveAction] PDF generated:", {
        requestId: draft.request_id,
        isPermanent: isPermanentStorageUrl(pdfUrl),
        url: pdfUrl.substring(0, 60) + "...",
      })
    } catch (pdfError) {
      console.error("[generatePathologyPdfAndApproveAction] PDF generation error:", pdfError)
      const errorMessage = pdfError instanceof Error ? pdfError.message : "Failed to generate PDF"
      return { success: false, error: errorMessage }
    }

    // INVARIANT CHECK: PDF URL must be permanent (Supabase Storage)
    if (!isPermanentStorageUrl(pdfUrl)) {
      console.error("[generatePathologyPdfAndApproveAction] INVARIANT VIOLATION: PDF URL is not permanent storage", {
        requestId: draft.request_id,
        url: pdfUrl.substring(0, 80),
      })
      return { 
        success: false, 
        error: "PDF storage failed - document URL is not permanent. Please try again.",
        code: "TEMPORARY_URL"
      }
    }

    // Create document record with verification
    const document = await createGeneratedDocument(draft.request_id, "referral", subtype, pdfUrl)

    if (!document) {
      console.error("[generatePathologyPdfAndApproveAction] Failed to save document record")
      return { success: false, error: "PDF generated but failed to save document record", code: "DOCUMENT_MISSING" }
    }

    // INVARIANT CHECK: Verify document was actually persisted before approving
    const documentExists = await hasDocumentForRequest(draft.request_id)
    if (!documentExists) {
      console.error("[generatePathologyPdfAndApproveAction] INVARIANT VIOLATION: Document not found after creation")
      return { success: false, error: "Document verification failed - please try again", code: "DOCUMENT_MISSING" }
    }

    // INVARIANT CHECK: Verify stored URL is permanent
    const urlCheck = await verifyDocumentUrlIsPermanent(draft.request_id)
    if (!urlCheck.valid) {
      console.error("[generatePathologyPdfAndApproveAction] INVARIANT VIOLATION: Stored URL is not permanent", {
        requestId: draft.request_id,
        error: urlCheck.error,
      })
      return { success: false, error: urlCheck.error || "Document URL verification failed", code: "TEMPORARY_URL" }
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

    // INVARIANT CHECK: Verify all approval prerequisites
    try {
      await assertApprovalInvariants(requestId)
    } catch (invariantError) {
      if (invariantError instanceof ApprovalInvariantError) {
        console.error("[approvePathologyWithoutPdfAction] Invariant check failed:", {
          requestId,
          code: invariantError.code,
          errors: invariantError.details,
        })
        return { 
          success: false, 
          error: invariantError.message,
          code: invariantError.code 
        }
      }
      throw invariantError
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
