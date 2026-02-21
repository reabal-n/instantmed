"use server"

/**
 * Admin Configuration Server Actions
 * Handles email templates, content blocks, audit logs, feature flags, and refunds
 */

import { revalidatePath } from "next/cache"
import { requireRole } from "@/lib/auth"
import {
  getAllEmailTemplates,
  getEmailTemplateById,
  createEmailTemplate,
  updateEmailTemplate,
  toggleEmailTemplateActive,
  type EmailTemplateInput,
} from "@/lib/data/email-templates"
import {
  getAllContentBlocks,
  getContentBlockByKey,
  createContentBlock,
  updateContentBlock,
  deleteContentBlock,
  type ContentBlockInput,
} from "@/lib/data/content-blocks"
import {
  getAuditLogs,
  getAuditLogStats,
  type AuditLogFilters,
} from "@/lib/data/audit-logs"
import {
  getPaymentsWithRefunds,
  getEligibleRefunds,
  getRefundStats,
  markRefundEligible,
  updateRefundStatus,
  markRefundNotEligible,
  type RefundFilters,
} from "@/lib/data/refunds"
import {
  getFeatureFlags,
  updateFeatureFlag,
  refreshFeatureFlags,
  type FlagKey,
} from "@/lib/feature-flags"
import { createLogger } from "@/lib/observability/logger"
import { logAuditEvent } from "@/lib/security/audit-log"

const log = createLogger("admin-config-actions")

// ============================================================================
// AUTH HELPER - Use canonical requireRole
// ============================================================================

async function requireAdmin() {
  const { profile } = await requireRole(["admin"])
  return profile
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
  const admin = await requireAdmin()
  const result = await createEmailTemplate(input, admin.id)
  if (result.success) {
    revalidatePath("/admin/emails")
    log.info("Email template created", { adminId: admin.id, slug: input.slug })
  }
  return result
}

export async function updateEmailTemplateAction(id: string, input: Partial<EmailTemplateInput>) {
  const admin = await requireAdmin()
  const result = await updateEmailTemplate(id, input, admin.id)
  if (result.success) {
    revalidatePath("/admin/emails")
    log.info("Email template updated", { adminId: admin.id, templateId: id })
  }
  return result
}

export async function toggleEmailTemplateActiveAction(id: string, isActive: boolean) {
  const admin = await requireAdmin()
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
  const admin = await requireAdmin()
  const result = await createContentBlock(input, admin.id)
  if (result.success) {
    revalidatePath("/admin/content")
    log.info("Content block created", { adminId: admin.id, key: input.key })
  }
  return result
}

export async function updateContentBlockAction(id: string, input: Partial<ContentBlockInput>) {
  const admin = await requireAdmin()
  const result = await updateContentBlock(id, input, admin.id)
  if (result.success) {
    revalidatePath("/admin/content")
    log.info("Content block updated", { adminId: admin.id, blockId: id })
  }
  return result
}

export async function deleteContentBlockAction(id: string) {
  const admin = await requireAdmin()
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

// ============================================================================
// FEATURE FLAG ACTIONS
// ============================================================================

export async function getFeatureFlagsAction() {
  await requireAdmin()
  return getFeatureFlags()
}

export async function updateFeatureFlagAction(key: FlagKey, value: boolean | string | string[]) {
  const admin = await requireAdmin()
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
  const admin = await requireAdmin()
  const result = await markRefundEligible(paymentId, reason)
  if (result.success) {
    revalidatePath("/admin/refunds")
    log.info("Refund marked eligible", { adminId: admin.id, paymentId, reason })
  }
  return result
}

export async function processRefundAction(
  paymentId: string,
  stripeRefundId: string,
  refundAmount: number,
  intakeId?: string
) {
  const admin = await requireAdmin()
  
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
      stripeRefundId,
    },
  })
  
  // First mark as processing
  await updateRefundStatus(paymentId, "processing")
  
  // Then mark as refunded (in real implementation, this would call Stripe)
  const result = await updateRefundStatus(paymentId, "refunded", stripeRefundId, refundAmount)
  
  if (result.success) {
    // Log successful refund for audit trail
    await logAuditEvent({
      action: "refund_succeeded",
      actorId: admin.id,
      actorType: "admin",
      intakeId,
      fromState: "processing",
      toState: "refunded",
      metadata: {
        paymentId,
        amount: refundAmount,
        stripeRefundId,
      },
    })
    revalidatePath("/admin/refunds")
    log.info("Refund processed", { adminId: admin.id, paymentId, stripeRefundId, refundAmount })
  } else {
    // Log failed refund for audit trail
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
        stripeRefundId,
        error: result.error,
      },
    })
  }
  return result
}

export async function markRefundNotEligibleAction(paymentId: string, reason: string) {
  const admin = await requireAdmin()
  const result = await markRefundNotEligible(paymentId, reason)
  if (result.success) {
    revalidatePath("/admin/refunds")
    log.info("Refund marked not eligible", { adminId: admin.id, paymentId, reason })
  }
  return result
}
