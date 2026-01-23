/**
 * Refunds Data Layer
 * Operations for payment refunds and disputes
 */

import "server-only"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { createLogger } from "@/lib/observability/logger"

// Re-export types and helpers from shared module (for backward compatibility)
export type { RefundStatus, PaymentWithRefund, RefundFilters, RefundStats } from "@/lib/data/types/refunds"
export { getRefundStatuses, formatRefundStatus, formatAmount } from "@/lib/data/types/refunds"

import type { PaymentWithRefund, RefundFilters } from "@/lib/data/types/refunds"

const log = createLogger("refunds")

// ============================================================================
// READ OPERATIONS
// ============================================================================

/**
 * Get payments with refund information
 */
export async function getPaymentsWithRefunds(
  filters: RefundFilters = {},
  page: number = 1,
  pageSize: number = 50
): Promise<{ data: PaymentWithRefund[]; total: number }> {
  const supabase = createServiceRoleClient()

  let query = supabase
    .from("payments")
    .select(`
      *,
      intake:intakes!intake_id (
        id,
        status,
        patient:profiles!patient_id (full_name, email)
      )
    `, { count: "exact" })
    .order("created_at", { ascending: false })

  // Apply filters
  if (filters.status) {
    query = query.eq("refund_status", filters.status)
  }
  if (filters.startDate) {
    query = query.gte("created_at", filters.startDate)
  }
  if (filters.endDate) {
    query = query.lte("created_at", filters.endDate)
  }

  // Pagination
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1
  query = query.range(from, to)

  const { data, error, count } = await query

  if (error) {
    log.error("Failed to fetch payments with refunds", {}, error)
    return { data: [], total: 0 }
  }

  return {
    data: data as PaymentWithRefund[],
    total: count || 0,
  }
}

/**
 * Get refund-eligible payments
 */
export async function getEligibleRefunds(): Promise<PaymentWithRefund[]> {
  const supabase = createServiceRoleClient()

  const { data, error } = await supabase
    .from("payments")
    .select(`
      *,
      intake:intakes!intake_id (
        id,
        status,
        patient:profiles!patient_id (full_name, email)
      )
    `)
    .eq("refund_status", "eligible")
    .order("created_at", { ascending: false })

  if (error) {
    log.error("Failed to fetch eligible refunds", {}, error)
    return []
  }

  return data as PaymentWithRefund[]
}

/**
 * Get refund stats
 */
export async function getRefundStats(): Promise<{
  eligible: number
  processing: number
  refunded: number
  failed: number
  totalRefunded: number
}> {
  const supabase = createServiceRoleClient()

  const { data, error } = await supabase
    .from("payments")
    .select("refund_status, refund_amount")
    .neq("refund_status", "not_applicable")

  if (error) {
    log.error("Failed to fetch refund stats", {}, error)
    return { eligible: 0, processing: 0, refunded: 0, failed: 0, totalRefunded: 0 }
  }

  const stats = {
    eligible: 0,
    processing: 0,
    refunded: 0,
    failed: 0,
    totalRefunded: 0,
  }

  for (const row of data || []) {
    if (row.refund_status === "eligible") stats.eligible++
    else if (row.refund_status === "processing") stats.processing++
    else if (row.refund_status === "refunded") {
      stats.refunded++
      stats.totalRefunded += row.refund_amount || 0
    }
    else if (row.refund_status === "failed") stats.failed++
  }

  return stats
}

// ============================================================================
// WRITE OPERATIONS
// ============================================================================

/**
 * Mark payment as eligible for refund
 */
export async function markRefundEligible(
  paymentId: string,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createServiceRoleClient()

  const { error } = await supabase
    .from("payments")
    .update({
      refund_status: "eligible",
      refund_reason: reason,
      updated_at: new Date().toISOString(),
    })
    .eq("id", paymentId)

  if (error) {
    log.error("Failed to mark refund eligible", { paymentId }, error)
    return { success: false, error: error.message }
  }

  log.info("Payment marked as refund eligible", { paymentId, reason })
  return { success: true }
}

/**
 * Process a refund (updates local state - actual Stripe refund handled separately)
 */
export async function updateRefundStatus(
  paymentId: string,
  status: "processing" | "refunded" | "failed",
  stripeRefundId?: string,
  refundAmount?: number
): Promise<{ success: boolean; error?: string }> {
  const supabase = createServiceRoleClient()

  const updateData: Record<string, unknown> = {
    refund_status: status,
    updated_at: new Date().toISOString(),
  }

  if (stripeRefundId) {
    updateData.stripe_refund_id = stripeRefundId
  }

  if (status === "refunded") {
    updateData.refunded_at = new Date().toISOString()
    if (refundAmount !== undefined) {
      updateData.refund_amount = refundAmount
    }
  }

  const { error } = await supabase
    .from("payments")
    .update(updateData)
    .eq("id", paymentId)

  if (error) {
    log.error("Failed to update refund status", { paymentId, status }, error)
    return { success: false, error: error.message }
  }

  log.info("Refund status updated", { paymentId, status, stripeRefundId })
  return { success: true }
}

/**
 * Mark payment as not eligible for refund
 */
export async function markRefundNotEligible(
  paymentId: string,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createServiceRoleClient()

  const { error } = await supabase
    .from("payments")
    .update({
      refund_status: "not_eligible",
      refund_reason: reason,
      updated_at: new Date().toISOString(),
    })
    .eq("id", paymentId)

  if (error) {
    log.error("Failed to mark refund not eligible", { paymentId }, error)
    return { success: false, error: error.message }
  }

  log.info("Payment marked as not eligible for refund", { paymentId, reason })
  return { success: true }
}

// Helpers are now exported from @/lib/data/types/refunds
