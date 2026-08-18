"use server"

/**
 * Admin Configuration Server Actions
 * Handles email templates, audit logs, feature flags, and refunds
 */

import { requireRole } from "@/lib/auth/helpers"
import { revalidateStaff } from "@/lib/dashboard/revalidate-staff"
import {
  type AuditLogFilters,
  getAuditLogs,
} from "@/lib/data/audit-logs"
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
} from "@/lib/data/refunds"
import {
  type FlagKey,
  getFeatureFlags,
  refreshFeatureFlags,
  updateFeatureFlag,
} from "@/lib/feature-flags"
import { createLogger } from "@/lib/observability/logger"
import { startOfDayAEST } from "@/lib/operator/cases/time-grouping"
import { checkServerActionRateLimit } from "@/lib/rate-limit/redis"
import { logAuditEvent } from "@/lib/security/audit-log"
import { stripe } from "@/lib/stripe/client"
import { requestStripeRefund } from "@/lib/stripe/refund-attempts"

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
    revalidateStaff({ emails: true })
    log.info("Email template created", { adminId: admin.id, slug: input.slug })
  }
  return result
}

export async function updateEmailTemplateAction(id: string, input: Partial<EmailTemplateInput>) {
  const admin = await requireAdminWithRateLimit()
  const result = await updateEmailTemplate(id, input, admin.id)
  if (result.success) {
    revalidateStaff({ emails: true })
    log.info("Email template updated", { adminId: admin.id, templateId: id })
  }
  return result
}

export async function toggleEmailTemplateActiveAction(id: string, isActive: boolean) {
  const admin = await requireAdminWithRateLimit()
  const result = await toggleEmailTemplateActive(id, isActive)
  if (result.success) {
    revalidateStaff({ emails: true })
    log.info("Email template toggled", { adminId: admin.id, templateId: id, isActive })
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
    revalidateStaff({ settings: true })
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

  // AEST day boundary, not server-local/UTC — see startOfDayAEST for why.
  const todayISO = startOfDayAEST(new Date()).toISOString()

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
    revalidateStaff({ content: true })
    log.info("Refund marked eligible", { adminId: admin.id, paymentId, reason })
  }
  return result
}

export async function processRefundAction(
  paymentId: string,
  refundAmount: number,
  _intakeId?: string,
) {
  const admin = await requireAdminWithRateLimit()

  const supabase = (await import("@/lib/supabase/service-role")).createServiceRoleClient()
  const { data: payment, error: paymentError } = await supabase
    .from("payments")
    .select("intake_id, stripe_payment_intent_id, amount")
    .eq("id", paymentId)
    .single()

  if (
    paymentError ||
    !payment?.stripe_payment_intent_id ||
    !payment.intake_id ||
    !Number.isSafeInteger(payment.amount) ||
    payment.amount <= 0
  ) {
    log.error("Payment is not durably linked to a refundable intake", {
      error: paymentError,
      paymentId,
    })
    return {
      success: false,
      error: "Payment record is not safely linked to a refundable request",
    }
  }
  if (refundAmount !== payment.amount) {
    return {
      success: false,
      error: "Refund amount changed. Refresh the payment record and try again.",
    }
  }
  const intakeId = payment.intake_id

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

  const result = await requestStripeRefund({ stripe, supabase }, {
    actorProfileId: admin.id,
    intakeId,
    paymentIntentId: payment.stripe_payment_intent_id,
    refundType: "admin_manual",
    targetTotalCents: payment.amount,
  })
  if (result.status === "failed") {
    await logAuditEvent({
      action: "refund_failed",
      actorId: admin.id,
      actorType: "admin",
      intakeId,
      fromState: "eligible",
      toState: "failed",
      metadata: {
        paymentId,
        amount: refundAmount,
        stripePaymentIntentId: payment.stripe_payment_intent_id,
        error: result.error,
      },
    })
    return {
      success: false,
      error: "Could not reserve this refund safely. Refresh and try again.",
    }
  }

  if (result.status === "cash_satisfied") {
    await logAuditEvent({
      action: "refund_succeeded",
      actorId: admin.id,
      actorType: "admin",
      intakeId,
      fromState: "eligible",
      toState: "refunded",
      metadata: {
        paymentId,
        amount: 0,
        stripePaymentIntentId: payment.stripe_payment_intent_id,
      },
    })
    revalidateStaff({ content: true })
    return { success: true, pending: false }
  }

  await logAuditEvent({
    action: "refund_requested",
    actorId: admin.id,
    actorType: "admin",
    intakeId,
    fromState: "eligible",
    toState: "processing",
    metadata: {
      paymentId,
      amount: result.amountCents,
      attemptId: result.attemptId,
      stripeRefundId: result.refundId,
      outcome: result.status,
    },
  })
  revalidateStaff({ content: true })
  log.info("Durable refund attempt reserved", {
    adminId: admin.id,
    amount: result.amountCents,
    attemptId: result.attemptId,
    outcome: result.status,
    paymentId,
    stripeRefundId: result.refundId,
  })
  return {
    success: true,
    pending: true,
    ...(result.refundId ? { refundId: result.refundId } : {}),
  }
}

export async function markRefundNotEligibleAction(paymentId: string, reason: string) {
  const admin = await requireAdminWithRateLimit()
  const result = await markRefundNotEligible(paymentId, reason)
  if (result.success) {
    revalidateStaff({ content: true })
    log.info("Refund marked not eligible", { adminId: admin.id, paymentId, reason })
  }
  return result
}
