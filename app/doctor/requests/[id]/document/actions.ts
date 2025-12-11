"use server"

import { revalidatePath } from "next/cache"
import { requireAuth } from "@/lib/auth"
import { updateMedCertDraftData, getDraftById, createGeneratedDocument } from "@/lib/data/documents"
import { updateRequestStatus } from "@/lib/data/requests"
import { generateMedCertPdfFromDraft, testApiTemplateConnection } from "@/lib/documents/apitemplate"
import type { MedCertDraftData } from "@/types/db"

export async function saveMedCertDraftAction(
  draftId: string,
  data: MedCertDraftData,
): Promise<{ success: boolean; error?: string }> {
  try {
    const { profile } = await requireAuth("doctor")
    if (!profile) {
      return { success: false, error: "Unauthorized" }
    }

    const updatedDraft = await updateMedCertDraftData(draftId, data)

    if (!updatedDraft) {
      return { success: false, error: "Failed to save draft" }
    }

    return { success: true }
  } catch (error) {
    console.error("Error saving draft:", error)
    return { success: false, error: "An unexpected error occurred" }
  }
}

export async function generateMedCertPdfAndApproveAction(
  draftId: string,
  data: MedCertDraftData,
): Promise<{ success: boolean; pdfUrl?: string; error?: string }> {
  try {
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

    // Generate PDF using APITemplate - pass the subtype
    let pdfUrl: string
    try {
      pdfUrl = await generateMedCertPdfFromDraft(data, draft.subtype)
    } catch (pdfError) {
      console.error("PDF generation error:", pdfError)
      const errorMessage = pdfError instanceof Error ? pdfError.message : "Failed to generate PDF"
      return { success: false, error: errorMessage }
    }

    // Create document record with correct subtype
    const document = await createGeneratedDocument(draft.request_id, draft.type, draft.subtype, pdfUrl)

    if (!document) {
      console.error("Failed to save document record")
      return { success: false, error: "PDF generated but failed to save document record" }
    }

    // Update request status to approved
    const updatedRequest = await updateRequestStatus(draft.request_id, "approved")

    if (!updatedRequest) {
      console.error("Failed to update request status")
      return { success: false, error: "PDF generated but failed to update request status" }
    }

    // Revalidate paths
    revalidatePath(`/doctor/requests/${draft.request_id}`)
    revalidatePath(`/doctor/requests/${draft.request_id}/document`)
    revalidatePath("/doctor")
    revalidatePath("/doctor/admin")

    return { success: true, pdfUrl }
  } catch (error) {
    console.error("Error in generateMedCertPdfAndApproveAction:", error)
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

export async function approveWithoutPdfAction(requestId: string): Promise<{ success: boolean; error?: string }> {
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
    console.error("Error approving request:", error)
    return { success: false, error: "An unexpected error occurred" }
  }
}
