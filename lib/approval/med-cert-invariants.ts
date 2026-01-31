/**
 * Medical Certificate Approval Invariants
 * 
 * Safety checks to ensure data integrity before approving a medical certificate
 * These invariants must pass before a certificate can be marked as approved
 */

import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { createLogger } from "@/lib/observability/logger"
import * as Sentry from "@sentry/nextjs"

const logger = createLogger("med-cert-invariants")

export class ApprovalInvariantError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "ApprovalInvariantError"
  }
}

/**
 * Verify that a draft exists for the request
 */
export async function assertDraftExists(
  requestId: string
): Promise<{ id: string; request_id: string }> {
  const supabase = createServiceRoleClient()

  const { data, error } = await supabase
    .from("document_drafts")
    .select("id, request_id")
    .eq("request_id", requestId)
    .eq("document_type", "med_cert")
    .single()

  if (error || !data) {
    throw new ApprovalInvariantError(
      `No med_cert draft found for request ${requestId}`
    )
  }

  return data
}

/**
 * Verify that the generated document is stored in Supabase Storage
 * (i.e., the PDF actually exists at the URL)
 */
export async function assertDocumentUrlIsPermanent(
  pdfUrl: string
): Promise<boolean> {
  try {
    // Extract bucket and path from URL
    // Format: https://xxx.supabase.co/storage/v1/object/public/documents/uuid/file.pdf
    const urlObj = new URL(pdfUrl)
    const pathParts = urlObj.pathname.split("/")

    // Verify it's a Supabase storage URL
    if (!pathParts.includes("storage") || !pathParts.includes("public")) {
      throw new ApprovalInvariantError(`Invalid Supabase storage URL: ${pdfUrl}`)
    }

    // Attempt HEAD request to verify URL is accessible
    const response = await fetch(pdfUrl, { method: "HEAD" })
    if (!response.ok) {
      throw new ApprovalInvariantError(
        `PDF URL not accessible: ${pdfUrl} (status: ${response.status})`
      )
    }

    return true
  } catch (error) {
    if (error instanceof ApprovalInvariantError) {
      throw error
    }
    throw new ApprovalInvariantError(
      `Failed to verify PDF URL: ${error instanceof Error ? error.message : "unknown error"}`
    )
  }
}

/**
 * Verify that the generated document record exists in database
 */
export async function assertGeneratedDocumentExists(
  requestId: string
): Promise<{ id: string; pdf_url: string; created_at: string }> {
  const supabase = createServiceRoleClient()

  const { data, error } = await supabase
    .from("generated_documents")
    .select("id, pdf_url, created_at")
    .eq("request_id", requestId)
    .eq("type", "med_cert")
    .order("created_at", { ascending: false })
    .limit(1)
    .single()

  if (error || !data) {
    throw new ApprovalInvariantError(
      `No generated document record found for request ${requestId}`
    )
  }

  return data
}

/**
 * Verify that the request hasn't already been approved
 * (prevent double-approval)
 */
export async function assertNotAlreadyApproved(
  requestId: string
): Promise<void> {
  const supabase = createServiceRoleClient()

  const { data: request, error } = await supabase
    .from("med_cert_requests")
    .select("status")
    .eq("id", requestId)
    .single()

  if (error || !request) {
    throw new ApprovalInvariantError(`Request not found: ${requestId}`)
  }

  if (request.status === "approved") {
    throw new ApprovalInvariantError(
      `Request ${requestId} has already been approved`
    )
  }
}

/**
 * Run all approval invariants before marking request as approved
 * Returns the generated document URL if all checks pass
 */
export async function assertApprovalInvariants(
  requestId: string
): Promise<{ pdfUrl: string; documentId: string }> {
  logger.info(`[approval-invariants] Starting invariant checks for ${requestId}`)

  try {
    // Check 1: Draft must exist
    const draft = await assertDraftExists(requestId)
    logger.debug(`[approval-invariants] Draft verified: ${draft.id}`)

    // Check 2: Request must not already be approved
    await assertNotAlreadyApproved(requestId)
    logger.debug(`[approval-invariants] Request approval status verified`)

    // Check 3: Generated document must exist
    const doc = await assertGeneratedDocumentExists(requestId)
    logger.debug(`[approval-invariants] Generated document verified: ${doc.id}`)

    // Check 4: PDF URL must be permanent (accessible in storage)
    await assertDocumentUrlIsPermanent(doc.pdf_url)
    logger.debug(`[approval-invariants] PDF URL accessibility verified`)

    logger.info(`[approval-invariants] All invariants passed for ${requestId}`)

    return {
      pdfUrl: doc.pdf_url,
      documentId: doc.id,
    }
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error))
    
    logger.error(
      `[approval-invariants] Invariant check failed`,
      { requestId },
      err
    )
    
    // Alert via Sentry for critical approval failures
    Sentry.captureException(err, {
      level: "error",
      tags: {
        source: "approval-invariants",
        alert_type: "safety_critical",
      },
      extra: {
        requestId,
        invariantType: err instanceof ApprovalInvariantError ? "known" : "unexpected",
      },
    })
    
    throw error
  }
}
