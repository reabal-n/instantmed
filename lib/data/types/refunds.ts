/**
 * Refunds - Shared Types & Helpers (Client-Safe)
 * 
 * These types and helpers can be imported in both client and server components.
 * Server-only database operations remain in lib/data/refunds.ts
 */

// ============================================================================
// TYPES
// ============================================================================

export type RefundStatus = "not_applicable" | "eligible" | "processing" | "refunded" | "failed" | "not_eligible"

export interface PaymentWithRefund {
  id: string
  intake_id: string
  stripe_payment_intent_id: string
  amount: number
  status: string
  refund_status: RefundStatus
  refund_reason: string | null
  stripe_refund_id: string | null
  refunded_at: string | null
  refund_amount: number | null
  created_at: string
  updated_at: string
  // Joined
  intake?: {
    id: string
    status: string
    category: string | null
    patient: {
      full_name: string
      email: string
    }
  }
}

export interface RefundFilters {
  status?: string
  startDate?: string
  endDate?: string
  search?: string
}

export interface RefundStats {
  eligible: number
  processing: number
  refunded: number
  failed: number
  totalRefunded: number
}

// ============================================================================
// HELPERS (Client-Safe)
// ============================================================================

/**
 * Get refund statuses for filtering
 */
export function getRefundStatuses(): { value: string; label: string }[] {
  return [
    { value: "eligible", label: "Eligible" },
    { value: "processing", label: "Processing" },
    { value: "refunded", label: "Refunded" },
    { value: "failed", label: "Failed" },
    { value: "not_eligible", label: "Not Eligible" },
  ]
}

/**
 * Format refund status for display
 */
export function formatRefundStatus(status: string): string {
  const statuses = getRefundStatuses()
  return statuses.find(s => s.value === status)?.label || status
}

/**
 * Format amount in cents to AUD
 */
export function formatAmount(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}
