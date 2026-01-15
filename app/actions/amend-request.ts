"use server"

/**
 * Server action stub for request amendments.
 * TODO: Implement if amendment feature is needed.
 */

interface AmendmentData {
  additionalNotes: string
}

interface AmendmentResult {
  success: boolean
  message?: string
  error?: string
}

export async function submitRequestAmendmentAction(
  _requestId: string,
  _data: AmendmentData
): Promise<AmendmentResult> {
  // Stub implementation - feature not yet implemented
  return {
    success: false,
    error: "Amendment feature is not yet implemented",
  }
}
