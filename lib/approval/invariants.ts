import "server-only"

import { createClient } from "@/lib/supabase/server"
import { isPermanentStorageUrl } from "../storage/documents"

/**
 * Approval Invariant Checks
 * 
 * These checks MUST pass before any intake can be approved.
 * If any check fails, approval is blocked with a hard error.
 */

export interface InvariantCheckResult {
  valid: boolean
  errors: string[]
  warnings: string[]
}

/**
 * Check all approval invariants for an intake
 */
export async function checkApprovalInvariants(
  intakeId: string,
  pdfUrl?: string
): Promise<InvariantCheckResult> {
  const errors: string[] = []
  const warnings: string[] = []

  const supabase = await createClient()

  // 1. Fetch intake to check payment status (intakes is single source of truth)
  const { data: intake, error: intakeError } = await supabase
    .from("intakes")
    .select("id, status, payment_status")
    .eq("id", intakeId)
    .single()

  if (intakeError || !intake) {
    errors.push(`Intake not found: ${intakeId}`)
    return { valid: false, errors, warnings }
  }

  // INVARIANT 1: Intake must be paid
  if (intake.payment_status !== "paid") {
    errors.push(`Payment required: intake payment_status is '${intake.payment_status}', must be 'paid'`)
  }

  // INVARIANT 2: Intake must be in approvable state
  const approvableStatuses = ["paid", "in_review", "pending_info"]
  if (!approvableStatuses.includes(intake.status)) {
    errors.push(`Invalid status for approval: '${intake.status}', must be one of: ${approvableStatuses.join(", ")}`)
  }

  // INVARIANT 3: If PDF URL provided, it must be permanent (Supabase Storage)
  if (pdfUrl) {
    if (!isPermanentStorageUrl(pdfUrl)) {
      if (!pdfUrl.startsWith("http")) {
        errors.push(`Invalid document URL format: ${pdfUrl}`)
      } else {
        // URL is not in Supabase Storage - block approval
        errors.push(`Document URL is not in permanent Supabase Storage.`)
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
export async function verifyDocumentExists(intakeId: string): Promise<boolean> {
  const supabase = await createClient()

  const { count, error } = await supabase
    .from("documents")
    .select("id", { count: "exact", head: true })
    .eq("intake_id", intakeId)

  if (error) {
    // eslint-disable-next-line no-console
    if (process.env.NODE_ENV === 'development') console.error("[verifyDocumentExists] Error:", error)
    return false
  }

  return (count ?? 0) > 0
}

/**
 * Verify document URL is stored permanently
 */
export async function verifyDocumentUrlIsPermanent(intakeId: string): Promise<{
  valid: boolean
  url?: string
  error?: string
}> {
  const supabase = await createClient()

  const { data: doc, error } = await supabase
    .from("documents")
    .select("pdf_url")
    .eq("intake_id", intakeId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error || !doc) {
    return { valid: false, error: "No document found for intake" }
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
  intakeId: string,
  pdfUrl?: string
): Promise<void> {
  const result = await checkApprovalInvariants(intakeId, pdfUrl)

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
    // eslint-disable-next-line no-console
    if (process.env.NODE_ENV === 'development') console.warn("[ApprovalInvariants] Warnings:", result.warnings)
  }
}
