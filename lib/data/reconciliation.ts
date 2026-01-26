"use server"

/**
 * Payments Reconciliation Data Access
 * 
 * Server-side queries for identifying mismatches between
 * Stripe payment and delivery outcome.
 */

import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { createLogger } from "@/lib/observability/logger"
import * as Sentry from "@sentry/nextjs"

const logger = createLogger("reconciliation")

// ============================================================================
// TYPES
// ============================================================================

export type DeliveryStatus =
  | "pending"           // Payment received, delivery not yet attempted
  | "in_progress"       // Delivery in progress (review started, etc.)
  | "delivered"         // Successfully delivered
  | "failed"            // Delivery attempted but failed
  | "not_applicable"    // Declined/cancelled - no delivery expected

export interface ReconciliationRecord {
  intake_id: string
  reference_number: string
  created_at: string
  paid_at: string | null
  patient_email: string | null
  patient_name: string | null
  service_type: string | null
  subtype: string | null
  category: string | null
  stripe_payment_intent_id: string | null
  payment_status: string
  intake_status: string
  delivery_status: DeliveryStatus
  delivery_details: string
  last_error: string | null
  is_mismatch: boolean
  age_minutes: number
  // Refund tracking (for declined intakes)
  refund_status: string | null
  refund_error: string | null
  refund_failed: boolean
}

export interface ReconciliationResult {
  data: ReconciliationRecord[]
  summary: {
    total: number
    mismatches: number
    delivered: number
    pending: number
    failed: number
  }
  error?: string
}

export interface ReconciliationFilters {
  mismatch_only?: boolean
  category?: string
  date_from?: string
  date_to?: string
}

// ============================================================================
// DELIVERY EMAIL TYPES BY CATEGORY
// ============================================================================

const DELIVERY_EMAIL_TYPES: Record<string, string[]> = {
  medical_certificate: ["request_approved", "med_cert_patient", "certificate_delivery"],
  med_certs: ["request_approved", "med_cert_patient", "certificate_delivery"],
  prescription: ["script_sent", "request_approved"],
  common_scripts: ["script_sent", "request_approved"],
  consult: ["request_approved"],
}

// ============================================================================
// MAIN QUERY
// ============================================================================

/**
 * Get reconciliation records for paid intakes.
 * 
 * Identifies mismatches between payment status and delivery outcome:
 * - med_cert: paid + approved + document exists + email sent
 * - prescription: paid + script_sent email sent
 * - consult: paid + status progressed beyond "paid"
 */
export async function getReconciliationRecords(
  filters: ReconciliationFilters = {}
): Promise<ReconciliationResult> {
  const { mismatch_only = true, category, date_from, date_to } = filters

  try {
    const supabase = createServiceRoleClient()

    // Default to last 7 days if no date filter
    const defaultDateFrom = new Date()
    defaultDateFrom.setDate(defaultDateFrom.getDate() - 7)
    const dateFromISO = date_from || defaultDateFrom.toISOString()

    // Step 1: Get paid intakes (and declined with refund issues)
    let intakesQuery = supabase
      .from("intakes")
      .select(`
        id,
        reference_number,
        created_at,
        paid_at,
        status,
        payment_status,
        category,
        subtype,
        stripe_payment_intent_id,
        generated_document_url,
        script_sent,
        script_sent_at,
        refund_status,
        refund_error,
        patient:profiles!patient_id (
          email,
          full_name
        ),
        service:services!service_id (
          name,
          type
        )
      `)
      .or("payment_status.eq.paid,refund_status.eq.failed")
      .gte("created_at", dateFromISO)
      .order("created_at", { ascending: false })
      .limit(500)

    if (date_to) {
      intakesQuery = intakesQuery.lte("created_at", date_to)
    }

    if (category) {
      intakesQuery = intakesQuery.eq("category", category)
    }

    const { data: intakes, error: intakesError } = await intakesQuery

    if (intakesError) {
      logger.error("[Reconciliation] Failed to fetch intakes", { error: intakesError.message })
      return {
        data: [],
        summary: { total: 0, mismatches: 0, delivered: 0, pending: 0, failed: 0 },
        error: intakesError.message,
      }
    }

    if (!intakes || intakes.length === 0) {
      return {
        data: [],
        summary: { total: 0, mismatches: 0, delivered: 0, pending: 0, failed: 0 },
      }
    }

    // Step 2: Get email_outbox records for these intakes
    const intakeIds = intakes.map(i => i.id)
    const { data: emails, error: emailsError } = await supabase
      .from("email_outbox")
      .select("intake_id, email_type, status, error_message, created_at")
      .in("intake_id", intakeIds)
      .order("created_at", { ascending: false })

    if (emailsError) {
      logger.warn("[Reconciliation] Failed to fetch emails", { error: emailsError.message })
    }

    // Group emails by intake_id
    const emailsByIntake = new Map<string, typeof emails>()
    for (const email of emails || []) {
      if (!email.intake_id) continue
      const existing = emailsByIntake.get(email.intake_id) || []
      existing.push(email)
      emailsByIntake.set(email.intake_id, existing)
    }

    // Step 3: Get documents for these intakes (for med certs)
    const { data: documents, error: docsError } = await supabase
      .from("intake_documents")
      .select("intake_id, document_type, storage_path")
      .in("intake_id", intakeIds)

    if (docsError) {
      logger.warn("[Reconciliation] Failed to fetch documents", { error: docsError.message })
    }

    const docsByIntake = new Map<string, boolean>()
    for (const doc of documents || []) {
      docsByIntake.set(doc.intake_id, true)
    }

    // Step 4: Process each intake
    const now = new Date()
    const records: ReconciliationRecord[] = []

    for (const intake of intakes) {
      const patientRaw = intake.patient as unknown
      const patient = (Array.isArray(patientRaw) ? patientRaw[0] : patientRaw) as { email: string | null; full_name: string | null } | null
      const serviceRaw = intake.service as unknown
      const service = (Array.isArray(serviceRaw) ? serviceRaw[0] : serviceRaw) as { name: string | null; type: string | null } | null

      const intakeEmails = emailsByIntake.get(intake.id) || []
      const hasDocument = docsByIntake.get(intake.id) || !!intake.generated_document_url
      const intakeCategory = intake.category || service?.type || "unknown"

      // Calculate delivery status
      const { deliveryStatus, deliveryDetails, lastError, isMismatch } = calculateDeliveryStatus(
        intake,
        intakeEmails,
        hasDocument,
        intakeCategory
      )

      // Calculate age
      const paidAt = intake.paid_at ? new Date(intake.paid_at) : new Date(intake.created_at)
      const ageMinutes = Math.round((now.getTime() - paidAt.getTime()) / (1000 * 60))

      // Check for refund failure (counts as mismatch)
      const refundStatus = (intake as { refund_status?: string }).refund_status || null
      const refundError = (intake as { refund_error?: string }).refund_error || null
      const refundFailed = refundStatus === "failed"
      
      // Include refund failures in mismatch calculation
      const finalIsMismatch = isMismatch || refundFailed

      const record: ReconciliationRecord = {
        intake_id: intake.id,
        reference_number: intake.reference_number,
        created_at: intake.created_at,
        paid_at: intake.paid_at,
        patient_email: patient?.email || null,
        patient_name: patient?.full_name || null,
        service_type: service?.type || null,
        subtype: intake.subtype,
        category: intakeCategory,
        stripe_payment_intent_id: intake.stripe_payment_intent_id,
        payment_status: intake.payment_status,
        intake_status: intake.status,
        delivery_status: deliveryStatus,
        delivery_details: refundFailed ? `Refund failed: ${refundError || "Unknown error"}` : deliveryDetails,
        last_error: refundFailed ? refundError : lastError,
        is_mismatch: finalIsMismatch,
        age_minutes: ageMinutes,
        refund_status: refundStatus,
        refund_error: refundError,
        refund_failed: refundFailed,
      }

      // Filter by mismatch if requested
      if (mismatch_only && !finalIsMismatch) {
        continue
      }

      records.push(record)
    }

    // Capture Sentry warnings for old mismatches
    await captureMismatchWarnings(records)

    // Calculate summary
    const summary = {
      total: records.length,
      mismatches: records.filter(r => r.is_mismatch).length,
      delivered: records.filter(r => r.delivery_status === "delivered").length,
      pending: records.filter(r => r.delivery_status === "pending" || r.delivery_status === "in_progress").length,
      failed: records.filter(r => r.delivery_status === "failed").length,
    }

    return { data: records, summary }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    logger.error("[Reconciliation] Exception", { error: message })
    Sentry.captureException(err, { tags: { action: "get_reconciliation_records" } })
    return {
      data: [],
      summary: { total: 0, mismatches: 0, delivered: 0, pending: 0, failed: 0 },
      error: message,
    }
  }
}

// ============================================================================
// DELIVERY STATUS CALCULATION
// ============================================================================

interface DeliveryCalcResult {
  deliveryStatus: DeliveryStatus
  deliveryDetails: string
  lastError: string | null
  isMismatch: boolean
}

function calculateDeliveryStatus(
  intake: {
    status: string
    script_sent: boolean | null
    script_sent_at: string | null
    generated_document_url: string | null
    paid_at: string | null
    created_at: string
  },
  emails: Array<{ email_type: string; status: string; error_message: string | null }>,
  hasDocument: boolean,
  category: string
): DeliveryCalcResult {
  const status = intake.status
  
  // Not applicable cases
  if (status === "declined" || status === "cancelled" || status === "expired") {
    return {
      deliveryStatus: "not_applicable",
      deliveryDetails: `Status: ${status}`,
      lastError: null,
      isMismatch: false,
    }
  }

  // Find relevant delivery emails
  const deliveryEmailTypes = DELIVERY_EMAIL_TYPES[category] || DELIVERY_EMAIL_TYPES["consult"]
  const deliveryEmails = emails.filter(e => deliveryEmailTypes.includes(e.email_type))
  const sentEmail = deliveryEmails.find(e => e.status === "sent" || e.status === "skipped_e2e")
  const failedEmail = deliveryEmails.find(e => e.status === "failed")
  const lastError = failedEmail?.error_message || null

  // Calculate age for mismatch detection
  const paidAt = intake.paid_at ? new Date(intake.paid_at) : new Date(intake.created_at)
  const now = new Date()
  const ageMinutes = (now.getTime() - paidAt.getTime()) / (1000 * 60)

  // Category-specific logic
  const normalizedCategory = category.toLowerCase().replace(/_/g, "")
  
  // Medical Certificate
  if (normalizedCategory.includes("medcert") || normalizedCategory.includes("medicalcertificate") || category === "med_certs") {
    if (status === "approved" || status === "completed") {
      if (hasDocument && sentEmail) {
        return {
          deliveryStatus: "delivered",
          deliveryDetails: "Document generated + email sent",
          lastError: null,
          isMismatch: false,
        }
      }
      if (hasDocument && !sentEmail) {
        return {
          deliveryStatus: failedEmail ? "failed" : "pending",
          deliveryDetails: `Document exists, email ${failedEmail ? "failed" : "not sent"}`,
          lastError,
          isMismatch: ageMinutes > 15,
        }
      }
      if (!hasDocument) {
        return {
          deliveryStatus: "pending",
          deliveryDetails: "Approved but document not generated",
          lastError: null,
          isMismatch: ageMinutes > 15,
        }
      }
    }
    // In progress
    if (status === "in_review" || status === "pending_info") {
      return {
        deliveryStatus: "in_progress",
        deliveryDetails: `Status: ${status}`,
        lastError: null,
        isMismatch: false,
      }
    }
    // Still in paid status
    if (status === "paid") {
      return {
        deliveryStatus: "pending",
        deliveryDetails: "Awaiting review",
        lastError: null,
        isMismatch: ageMinutes > 15,
      }
    }
  }

  // Prescription / Common Scripts
  if (normalizedCategory.includes("prescription") || normalizedCategory.includes("script") || category === "common_scripts") {
    const scriptSent = intake.script_sent || sentEmail
    
    if (scriptSent) {
      return {
        deliveryStatus: "delivered",
        deliveryDetails: intake.script_sent ? "Script marked as sent" : "Script email sent",
        lastError: null,
        isMismatch: false,
      }
    }
    if (status === "approved" || status === "completed" || status === "awaiting_script") {
      return {
        deliveryStatus: failedEmail ? "failed" : "pending",
        deliveryDetails: `Approved, script ${failedEmail ? "email failed" : "not yet sent"}`,
        lastError,
        isMismatch: ageMinutes > 15,
      }
    }
    if (status === "in_review" || status === "pending_info") {
      return {
        deliveryStatus: "in_progress",
        deliveryDetails: `Status: ${status}`,
        lastError: null,
        isMismatch: false,
      }
    }
    if (status === "paid") {
      return {
        deliveryStatus: "pending",
        deliveryDetails: "Awaiting review",
        lastError: null,
        isMismatch: ageMinutes > 15,
      }
    }
  }

  // Consult / Other - delivery is clinical progression, not email
  if (status === "in_review" || status === "pending_info" || status === "approved" || status === "completed") {
    return {
      deliveryStatus: "delivered",
      deliveryDetails: `Clinical delivery: ${status}`,
      lastError: null,
      isMismatch: false,
    }
  }
  
  if (status === "paid") {
    return {
      deliveryStatus: "pending",
      deliveryDetails: "Awaiting clinical review",
      lastError: null,
      isMismatch: ageMinutes > 15,
    }
  }

  // Default
  return {
    deliveryStatus: "pending",
    deliveryDetails: `Status: ${status}`,
    lastError: null,
    isMismatch: ageMinutes > 15,
  }
}

// ============================================================================
// SENTRY WARNINGS
// ============================================================================

const warnedMismatches = new Set<string>()

async function captureMismatchWarnings(records: ReconciliationRecord[]): Promise<void> {
  if (process.env.DISABLE_RECONCILIATION_SENTRY === "true") {
    return
  }

  for (const record of records) {
    // Only warn for mismatches older than 15 minutes
    if (!record.is_mismatch || record.age_minutes < 15) {
      continue
    }

    const fingerprint = `${record.intake_id}:${record.delivery_status}`
    
    if (warnedMismatches.has(fingerprint)) {
      continue
    }

    warnedMismatches.add(fingerprint)

    Sentry.captureMessage(`Payment reconciliation mismatch: ${record.delivery_status}`, {
      level: "warning",
      tags: {
        intake_id: record.intake_id,
        delivery_status: record.delivery_status,
        intake_status: record.intake_status,
        category: record.category || "unknown",
        service_type: record.service_type || "unknown",
      },
      extra: {
        reference_number: record.reference_number,
        age_minutes: record.age_minutes,
        delivery_details: record.delivery_details,
        last_error: record.last_error,
        patient_email: record.patient_email,
      },
      fingerprint: ["reconciliation-mismatch", record.intake_id, record.delivery_status],
    })

    logger.warn("[Reconciliation] Mismatch detected", {
      intakeId: record.intake_id,
      deliveryStatus: record.delivery_status,
      ageMinutes: record.age_minutes,
    })
  }

  // Cleanup old fingerprints
  if (warnedMismatches.size > 1000) {
    const toDelete = Array.from(warnedMismatches).slice(0, 500)
    toDelete.forEach(fp => warnedMismatches.delete(fp))
  }
}

// ============================================================================
// CATEGORY LIST
// ============================================================================

export async function getDistinctCategories(): Promise<string[]> {
  try {
    const supabase = createServiceRoleClient()

    const { data, error } = await supabase
      .from("intakes")
      .select("category")
      .not("category", "is", null)
      .eq("payment_status", "paid")

    if (error || !data) return []

    const categories = [...new Set(data.map(r => r.category).filter(Boolean))]
    return categories as string[]
  } catch {
    return []
  }
}
