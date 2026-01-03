"use server"

import { revalidatePath } from "next/cache"
import { requireAuth } from "@/lib/auth"
import { updatePathologyDraftData, getDraftById, createGeneratedDocument } from "@/lib/data/documents"
import { updateRequestStatus } from "@/lib/data/requests"
import { logger } from "@/lib/logger"
import {
  generatePathologyReferralPdfFromDraft,
  testApiTemplateConnection,
  type PathologyDraftData,
  type PathologySubtype,
} from "@/lib/documents/apitemplate"

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
    logger.error("Error saving pathology draft:", { error })
    return { success: false, error: "An unexpected error occurred" }
  }
}

export async function generatePathologyPdfAndApproveAction(
  draftId: string,
  data: PathologyDraftData,
  subtype: PathologySubtype,
): Promise<{ success: boolean; pdfUrl?: string; error?: string }> {
  try {
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

    // Generate PDF using APITemplate
    let pdfUrl: string
    try {
      pdfUrl = await generatePathologyReferralPdfFromDraft(subtype, data)
    } catch (pdfError) {
      logger.error("Pathology PDF generation error:", { error: pdfError })
      const errorMessage = pdfError instanceof Error ? pdfError.message : "Failed to generate PDF"
      return { success: false, error: errorMessage }
    }

    // Create document record
    const document = await createGeneratedDocument(draft.request_id, "referral", subtype, pdfUrl)

    if (!document) {
      logger.error("Failed to save pathology document record")
      return { success: false, error: "PDF generated but failed to save document record" }
    }

    // Update request status to approved
    const updatedRequest = await updateRequestStatus(draft.request_id, "approved")

    if (!updatedRequest) {
      logger.error("Failed to update pathology request status")
      return { success: false, error: "PDF generated but failed to update request status" }
    }

    // Revalidate paths
    revalidatePath(`/doctor/requests/${draft.request_id}`)
    revalidatePath(`/doctor/requests/${draft.request_id}/pathology-document`)
    revalidatePath("/doctor")
    revalidatePath("/doctor/admin")

    return { success: true, pdfUrl }
  } catch (error) {
    logger.error("Error in generatePathologyPdfAndApproveAction:", { error })
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
    logger.error("Error testing API connection:", { error })
    return { success: false, error: "Failed to test connection" }
  }
}

export async function approvePathologyWithoutPdfAction(
  requestId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const { profile } = await requireAuth("doctor")
    if (!profile) {
      return { success: false, error: "Unauthorized" }
    }

    const updatedRequest = await updateRequestStatus(requestId, "approved")

    if (!updatedRequest) {
      return { success: false, error: "Failed to update request status" }
    }

    revalidatePath(`/doctor/requests/${requestId}`)
    revalidatePath("/doctor")
    revalidatePath("/doctor/admin")

    return { success: true }
  } catch (error) {
    logger.error("Error approving pathology request:", { error })
    return { success: false, error: "An unexpected error occurred" }
  }
}
