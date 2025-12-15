import "server-only"

import { createClient } from "@/lib/supabase/server"
import { isPermanentStorageUrl } from "../storage/documents"

/**
 * Approval Invariant Checks
 * 
 * These checks MUST pass before any request can be approved.
 * If any check fails, approval is blocked with a hard error.
 */

export interface InvariantCheckResult {
  valid: boolean
  errors: string[]
  warnings: string[]
}

/**
 * Check all approval invariants for a request
 */
export async function checkApprovalInvariants(
  requestId: string,
  pdfUrl?: string
): Promise<InvariantCheckResult> {
  const errors: string[] = []
  const warnings: string[] = []

  const supabase = await createClient()

  // 1. Fetch request to check payment status
  const { data: request, error: requestError } = await supabase
    .from("requests")
    .select("id, status, payment_status")
    .eq("id", requestId)
    .single()

  if (requestError || !request) {
    errors.push(`Request not found: ${requestId}`)
    return { valid: false, errors, warnings }
  }

  // INVARIANT 1: Request must be paid
  if (request.payment_status !== "paid") {
    errors.push(`Payment required: request payment_status is '${request.payment_status}', must be 'paid'`)
  }

  // INVARIANT 2: Request must be in approvable state
  const approvableStatuses = ["pending", "needs_follow_up"]
  if (!approvableStatuses.includes(request.status)) {
    errors.push(`Invalid status for approval: '${request.status}', must be one of: ${approvableStatuses.join(", ")}`)
  }

  // INVARIANT 3: If PDF URL provided, it must be permanent (Supabase Storage)
  if (pdfUrl) {
    if (!isPermanentStorageUrl(pdfUrl)) {
      // Check if it looks like a temporary APITemplate URL
      if (pdfUrl.includes("apitemplate.io") || pdfUrl.includes("s3.amazonaws.com")) {
        errors.push(`Document URL is temporary and will expire. URL must be stored in permanent Supabase Storage.`)
      } else if (!pdfUrl.startsWith("http")) {
        errors.push(`Invalid document URL format: ${pdfUrl}`)
      } else {
        // Unknown URL - warn but don't block
        warnings.push(`Document URL is not in Supabase Storage. It may not be permanently accessible.`)
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  }
}

/**
 * Verify document exists in database after creation
 */
export async function verifyDocumentExists(requestId: string): Promise<boolean> {
  const supabase = await createClient()

  const { count, error } = await supabase
    .from("documents")
    .select("id", { count: "exact", head: true })
    .eq("request_id", requestId)

  if (error) {
    console.error("[verifyDocumentExists] Error:", error)
    return false
  }

  return (count ?? 0) > 0
}

/**
 * Verify document URL is stored permanently
 */
export async function verifyDocumentUrlIsPermanent(requestId: string): Promise<{
  valid: boolean
  url?: string
  error?: string
}> {
  const supabase = await createClient()

  const { data: doc, error } = await supabase
    .from("documents")
    .select("pdf_url")
    .eq("request_id", requestId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error || !doc) {
    return { valid: false, error: "No document found for request" }
  }

  const isPermanent = isPermanentStorageUrl(doc.pdf_url)

  if (!isPermanent) {
    return {
      valid: false,
      url: doc.pdf_url,
      error: `Document URL is not permanent: ${doc.pdf_url.substring(0, 50)}...`,
    }
  }

  return { valid: true, url: doc.pdf_url }
}

/**
 * ApprovalInvariantError - thrown when an invariant check fails
 */
export class ApprovalInvariantError extends Error {
  code: "PAYMENT_REQUIRED" | "INVALID_STATUS" | "TEMPORARY_URL" | "DOCUMENT_MISSING"
  details: string[]

  constructor(message: string, code: ApprovalInvariantError["code"], details: string[] = []) {
    super(message)
    this.name = "ApprovalInvariantError"
    this.code = code
    this.details = details
  }
}

/**
 * Assert all approval invariants - throws if any fail
 */
export async function assertApprovalInvariants(
  requestId: string,
  pdfUrl?: string
): Promise<void> {
  const result = await checkApprovalInvariants(requestId, pdfUrl)

  if (!result.valid) {
    const firstError = result.errors[0] || "Approval invariant check failed"
    
    // Determine error code
    let code: ApprovalInvariantError["code"] = "INVALID_STATUS"
    if (firstError.includes("Payment required")) {
      code = "PAYMENT_REQUIRED"
    } else if (firstError.includes("temporary") || firstError.includes("permanent")) {
      code = "TEMPORARY_URL"
    } else if (firstError.includes("Document")) {
      code = "DOCUMENT_MISSING"
    }

    throw new ApprovalInvariantError(firstError, code, result.errors)
  }

  // Log warnings
  if (result.warnings.length > 0) {
    console.warn("[ApprovalInvariants] Warnings:", result.warnings)
  }
}
