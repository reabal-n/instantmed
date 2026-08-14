/**
 * Intake Ops Types
 * 
 * Types for operational monitoring of intakes.
 * Separated from the server actions file for Next.js 15 compatibility.
 */

export type StuckReason =
  | "paid_no_review"    // Paid but not picked up within 5 min
  | "review_timeout"    // In review/pending_info for >60 min
  | "delivery_pending"  // Approved but no delivery email within 10 min
  | "delivery_failed"   // Approved but delivery email failed

export interface StuckIntake {
  id: string
  reference_number: string
  status: string
  payment_status: string
  category: string | null
  subtype: string | null
  service_name: string | null
  service_type: string | null
  is_priority: boolean
  patient_email: string | null
  patient_name: string | null
  created_at: string
  paid_at: string | null
  reviewed_at: string | null
  approved_at: string | null
  stuck_reason: StuckReason
  stuck_age_minutes: number
}

export interface StuckCounts {
  paid_no_review: number
  review_timeout: number
  delivery_pending: number
  delivery_failed: number
  total: number
}

export interface StuckIntakesResult {
  data: StuckIntake[]
  counts: StuckCounts
  error?: string
}

export interface StuckIntakesFilters {
  reason?: StuckReason
  service_type?: string
  status?: string
}
