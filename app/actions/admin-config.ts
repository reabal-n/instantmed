"use server"

/**
 * Admin Configuration Server Actions
 * Handles email templates, content blocks, audit logs, feature flags, and refunds
 */

import { revalidatePath } from "next/cache"

import { requireRole } from "@/lib/auth/helpers"
import {
  type AuditLogFilters,
  getAuditLogs,
  getAuditLogStats,
} from "@/lib/data/audit-logs"
import {
  type ContentBlockInput,
  createContentBlock,
  deleteContentBlock,
  getAllContentBlocks,
  getContentBlockByKey,
  updateContentBlock,
} from "@/lib/data/content-blocks"
import {
  createEmailTemplate,
  type EmailTemplateInput,
  getAllEmailTemplates,
  getEmailTemplateById,
  toggleEmailTemplateActive,
  updateEmailTemplate,
} from "@/lib/data/email-templates"
import {
  getEligibleRefunds,
  getPaymentsWithRefunds,
  getRefundStats,
  markRefundEligible,
  markRefundNotEligible,
  type RefundFilters,
  updateRefundStatus,
} from "@/lib/data/refunds"
import {
  type FlagKey,
  getFeatureFlags,
  refreshFeatureFlags,
  updateFeatureFlag,
} from "@/lib/feature-flags"
import { createLogger } from "@/lib/observability/logger"
import { checkServerActionRateLimit } from "@/lib/rate-limit/redis"
import { logAuditEvent } from "@/lib/security/audit-log"
import { stripe } from "@/lib/stripe/client"

const log = createLogger("admin-config-actions")

// ============================================================================
// AUTH HELPER - Use canonical requireRole
// ============================================================================

async function requireAdmin() {
  const { profile } = await requireRole(["admin"])
  return profile
}

/**
 * Auth + rate limit guard for admin mutations.
 * Returns admin profile or throws/returns error shape.
 */
async function requireAdminWithRateLimit() {
  const profile = await requireAdmin()
  const rateLimit = await checkServerActionRateLimit(`admin:${profile.id}`, "admin")
  if (!rateLimit.success) {
    throw new RateLimitError(rateLimit.error || "Too many requests. Please wait a moment before trying again.")
  }
  return profile
}

class RateLimitError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "RateLimitError"
  }
}

// ============================================================================
// EMAIL TEMPLATE ACTIONS
// ============================================================================

export async function getAllEmailTemplatesAction() {
  await requireAdmin()
  return getAllEmailTemplates()
}

export async function getEmailTemplateByIdAction(id: string) {
  await requireAdmin()
  return getEmailTemplateById(id)
}

export async function createEmailTemplateAction(input: EmailTemplateInput) {
  const admin = await requireAdminWithRateLimit()
  const result = await createEmailTemplate(input, admin.id)
  if (result.success) {
    revalidatePath("/admin/emails")
    log.info("Email template created", { adminId: admin.id, slug: input.slug })
  }
  return result
}

export async function updateEmailTemplateAction(id: string, input: Partial<EmailTemplateInput>) {
  const admin = await requireAdminWithRateLimit()
  const result = await updateEmailTemplate(id, input, admin.id)
  if (result.success) {
    revalidatePath("/admin/emails")
    log.info("Email template updated", { adminId: admin.id, templateId: id })
  }
  return result
}

export async function toggleEmailTemplateActiveAction(id: string, isActive: boolean) {
  const admin = await requireAdminWithRateLimit()
  const result = await toggleEmailTemplateActive(id, isActive)
  if (result.success) {
    revalidatePath("/admin/emails")
    log.info("Email template toggled", { adminId: admin.id, templateId: id, isActive })
  }
  return result
}

// ============================================================================
// CONTENT BLOCK ACTIONS
// ============================================================================

export async function getAllContentBlocksAction() {
  await requireAdmin()
  return getAllContentBlocks()
}

export async function getContentBlockByKeyAction(key: string) {
  await requireAdmin()
  return getContentBlockByKey(key)
}

export async function createContentBlockAction(input: ContentBlockInput) {
  const admin = await requireAdminWithRateLimit()
  const result = await createContentBlock(input, admin.id)
  if (result.success) {
    revalidatePath("/admin/content")
    log.info("Content block created", { adminId: admin.id, key: input.key })
  }
  return result
}

export async function updateContentBlockAction(id: string, input: Partial<ContentBlockInput>) {
  const admin = await requireAdminWithRateLimit()
  const result = await updateContentBlock(id, input, admin.id)
  if (result.success) {
    revalidatePath("/admin/content")
    log.info("Content block updated", { adminId: admin.id, blockId: id })
  }
  return result
}

export async function deleteContentBlockAction(id: string) {
  const admin = await requireAdminWithRateLimit()
  const result = await deleteContentBlock(id)
  if (result.success) {
    revalidatePath("/admin/content")
    log.info("Content block deleted", { adminId: admin.id, blockId: id })
  }
  return result
}

// ============================================================================
// AUDIT LOG ACTIONS
// ============================================================================

export async function getAuditLogsAction(
  filters: AuditLogFilters = {},
  page: number = 1,
  pageSize: number = 50
) {
  await requireAdmin()
  return getAuditLogs(filters, page, pageSize)
}

export async function getAuditLogStatsAction() {
  await requireAdmin()
  return getAuditLogStats()
}

export async function getFeatureFlagAuditLogsAction() {
  await requireAdmin()
  const { data } = await getAuditLogs(
    { eventType: "settings_changed" },
    1,
    100
  )
  // Filter to feature flag and operational config changes
  return data.filter(
    (log) =>
      (log.metadata?.action_type === "feature_flag_updated" ||
        log.metadata?.action_type === "operational_config_updated")
  ).slice(0, 20)
}

// ============================================================================
// FEATURE FLAG ACTIONS
// ============================================================================

export async function getFeatureFlagsAction() {
  await requireAdmin()
  return getFeatureFlags()
}

export async function updateFeatureFlagAction(key: FlagKey, value: boolean | string | string[] | number | null) {
  const admin = await requireAdminWithRateLimit()
  const result = await updateFeatureFlag(key, value, admin.id)
  if (result.success) {
    revalidatePath("/admin/features")
    log.info("Feature flag updated", { adminId: admin.id, key, value })
  }
  return result
}

export async function refreshFeatureFlagsAction() {
  await requireAdmin()
  return refreshFeatureFlags()
}

// ============================================================================
// AUTO-APPROVE STATS
// ============================================================================

export interface AutoApproveStats {
  todayApproved: number
  todayFailed: number
  todaySkipped: number
  last7DaysApproved: number
  lastApprovedAt: string | null
  recentActivity: Array<{
    id: string
    intake_id: string | null
    eligible: boolean
    reason: string
    created_at: string
  }>
}

export async function getAutoApproveStatsAction(): Promise<AutoApproveStats> {
  await requireAdmin()

  const { createServiceRoleClient } = await import("@/lib/supabase/service-role")
  const supabase = createServiceRoleClient()

  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const todayISO = todayStart.toISOString()

  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  const sevenDaysAgoISO = sevenDaysAgo.toISOString()

  // Fetch today's auto-approve audit entries
  const [todayResult, weekResult, recentResult] = await Promise.all([
    supabase
      .from("ai_audit_log")
      .select("id, metadata")
      .eq("action", "auto_approve")
      .gte("created_at", todayISO),
    supabase
      .from("ai_audit_log")
      .select("id, metadata")
      .eq("action", "auto_approve")
      .gte("created_at", sevenDaysAgoISO)
      .not("metadata->certificate_id", "is", null),
    supabase
      .from("ai_audit_log")
      .select("id, intake_id, reason, metadata, created_at")
      .eq("action", "auto_approve")
      .order("created_at", { ascending: false })
      .limit(10),
  ])

  const todayEntries = todayResult.data || []
  const todayApproved = todayEntries.filter(e => {
    const meta = e.metadata as Record<string, unknown> | null
    return meta?.certificate_id != null
  }).length
  const todayTotal = todayEntries.length
  // Entries with eligible=true but no certificate_id are failures
  const todayFailed = todayEntries.filter(e => {
    const meta = e.metadata as Record<string, unknown> | null
    return meta?.eligible === true && meta?.certificate_id == null
  }).length
  const todaySkipped = todayTotal - todayApproved - todayFailed

  const weekApproved = (weekResult.data || []).length

  // Find last approved timestamp
  const lastApprovedEntry = (recentResult.data || []).find(e => {
    const meta = e.metadata as Record<string, unknown> | null
    return meta?.certificate_id != null
  })

  const recentActivity = (recentResult.data || []).map(e => {
    const meta = e.metadata as Record<string, unknown> | null
    return {
      id: e.id as string,
      intake_id: e.intake_id as string | null,
      eligible: (meta?.eligible as boolean) ?? (meta?.certificate_id != null),
      reason: (e.reason as string) || (meta?.certificate_id ? "Certificate issued" : "Unknown"),
      created_at: e.created_at as string,
    }
  })

  return {
    todayApproved,
    todayFailed,
    todaySkipped,
    last7DaysApproved: weekApproved,
    lastApprovedAt: lastApprovedEntry?.created_at as string | null ?? null,
    recentActivity,
  }
}

// ============================================================================
// REFUND ACTIONS
// ============================================================================

export async function getPaymentsWithRefundsAction(
  filters: RefundFilters = {},
  page: number = 1,
  pageSize: number = 50
) {
  await requireAdmin()
  return getPaymentsWithRefunds(filters, page, pageSize)
}

export async function getEligibleRefundsAction() {
  await requireAdmin()
  return getEligibleRefunds()
}

export async function getRefundStatsAction() {
  await requireAdmin()
  return getRefundStats()
}

export async function markRefundEligibleAction(paymentId: string, reason: string) {
  const admin = await requireAdminWithRateLimit()
  const result = await markRefundEligible(paymentId, reason)
  if (result.success) {
    revalidatePath("/admin/refunds")
    log.info("Refund marked eligible", { adminId: admin.id, paymentId, reason })
  }
  return result
}

export async function processRefundAction(
  paymentId: string,
  refundAmount: number,
  intakeId?: string
) {
  const admin = await requireAdminWithRateLimit()

  // Look up the payment to get the Stripe payment intent ID
  const supabase = (await import("@/lib/supabase/service-role")).createServiceRoleClient()
  const { data: payment, error: paymentError } = await supabase
    .from("payments")
    .select("stripe_payment_intent_id, amount")
    .eq("id", paymentId)
    .single()

  if (paymentError || !payment?.stripe_payment_intent_id) {
    log.error("Payment not found or missing Stripe payment intent ID", { paymentId, error: paymentError })
    return { success: false, error: "Payment record not found or missing Stripe payment intent ID" }
  }

  // Log refund attempt for audit trail
  await logAuditEvent({
    action: "refund_attempted",
    actorId: admin.id,
    actorType: "admin",
    intakeId,
    fromState: "eligible",
    toState: "processing",
    metadata: {
      paymentId,
      amount: refundAmount,
      stripePaymentIntentId: payment.stripe_payment_intent_id,
    },
  })

  // First mark as processing
  await updateRefundStatus(paymentId, "processing")

  // Call Stripe to create the refund
  let stripeRefund
  try {
    stripeRefund = await stripe.refunds.create({
      payment_intent: payment.stripe_payment_intent_id,
      amount: refundAmount,
      reason: "requested_by_customer",
      metadata: {
        payment_id: paymentId,
        intake_id: intakeId || "",
        admin_id: admin.id,
        refund_type: "admin_manual",
      },
    }, {
      idempotencyKey: `admin_refund_${paymentId}`,
    })
  } catch (stripeError) {
    const errorMessage = stripeError instanceof Error ? stripeError.message : String(stripeError)
    log.error("Stripe refund failed", { paymentId, error: errorMessage })

    // Mark as failed
    await updateRefundStatus(paymentId, "failed")

    await logAuditEvent({
      action: "refund_failed",
      actorId: admin.id,
      actorType: "admin",
      intakeId,
      fromState: "processing",
      toState: "failed",
      metadata: {
        paymentId,
        amount: refundAmount,
        stripePaymentIntentId: payment.stripe_payment_intent_id,
        error: errorMessage,
      },
    })

    return { success: false, error: `Stripe refund failed: ${errorMessage}` }
  }

  // Mark as refunded with the real Stripe refund ID
  const result = await updateRefundStatus(paymentId, "refunded", stripeRefund.id, stripeRefund.amount)

  if (result.success) {
    await logAuditEvent({
      action: "refund_succeeded",
      actorId: admin.id,
      actorType: "admin",
      intakeId,
      fromState: "processing",
      toState: "refunded",
      metadata: {
        paymentId,
        amount: stripeRefund.amount,
        stripeRefundId: stripeRefund.id,
      },
    })
    revalidatePath("/admin/refunds")
    log.info("Refund processed", { adminId: admin.id, paymentId, stripeRefundId: stripeRefund.id, refundAmount: stripeRefund.amount })
  } else {
    await logAuditEvent({
      action: "refund_failed",
      actorId: admin.id,
      actorType: "admin",
      intakeId,
      fromState: "processing",
      toState: "failed",
      metadata: {
        paymentId,
        amount: refundAmount,
        stripeRefundId: stripeRefund.id,
        error: result.error,
      },
    })
  }
  return result
}

export async function markRefundNotEligibleAction(paymentId: string, reason: string) {
  const admin = await requireAdminWithRateLimit()
  const result = await markRefundNotEligible(paymentId, reason)
  if (result.success) {
    revalidatePath("/admin/refunds")
    log.info("Refund marked not eligible", { adminId: admin.id, paymentId, reason })
  }
  return result
}
