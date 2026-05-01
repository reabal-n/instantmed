import {
  AlertCircle,
  Ban,
  CheckCircle2,
  Clock,
  CreditCard,
  FileSearch,
  type LucideIcon,
  Pill,
  RotateCcw,
  ShieldAlert,
  TimerOff,
  XCircle,
} from "lucide-react"

import type { DisplayIntakeStatus, DisplayPaymentStatus } from "@/types/intake"

// Re-export display types with short names for backward compatibility.
// Display-layer status types include UI-only statuses (pending, disputed, refunded)
// that don't exist in the DB lifecycle but are used for badge rendering.
export type IntakeStatus = DisplayIntakeStatus
export type PaymentStatus = DisplayPaymentStatus

interface StatusConfig {
  label: string
  color: string
  icon: LucideIcon
}

/**
 * Unified status config for all patient-facing pages.
 * Colors use the pattern: bg-{color}-100 dark:bg-{color}-950/40 text-{color}-700 dark:text-{color}-300
 * This replaces per-page STATUS_CONFIG objects.
 */
export const INTAKE_STATUS: Record<IntakeStatus, StatusConfig> = {
  draft: {
    label: "Draft",
    color: "bg-gray-100 dark:bg-gray-950/40 text-gray-700 dark:text-gray-300",
    icon: Clock,
  },
  approved: {
    label: "Approved",
    color: "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300",
    icon: CheckCircle2,
  },
  completed: {
    label: "Completed",
    color: "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300",
    icon: CheckCircle2,
  },
  paid: {
    label: "Under Review",
    color: "bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300",
    icon: FileSearch,
  },
  in_review: {
    label: "In Review",
    color: "bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300",
    icon: FileSearch,
  },
  pending: {
    label: "Pending",
    color: "bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300",
    icon: Clock,
  },
  pending_payment: {
    label: "Awaiting Payment",
    color: "bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300",
    icon: CreditCard,
  },
  declined: {
    label: "Declined",
    color: "bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-300",
    icon: XCircle,
  },
  escalated: {
    label: "Escalated",
    color: "bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-300",
    icon: ShieldAlert,
  },
  pending_info: {
    label: "More Info Needed",
    color: "bg-orange-100 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300",
    icon: AlertCircle,
  },
  cancelled: {
    label: "Cancelled",
    color: "bg-gray-100 dark:bg-gray-950/40 text-gray-700 dark:text-gray-300",
    icon: Ban,
  },
  awaiting_script: {
    label: "Preparing Script",
    color: "bg-purple-100 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300",
    icon: Pill,
  },
  expired: {
    label: "Expired",
    color: "bg-gray-100 dark:bg-gray-950/40 text-gray-700 dark:text-gray-300",
    icon: TimerOff,
  },
  disputed: {
    label: "Disputed",
    color: "bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-300",
    icon: ShieldAlert,
  },
  checkout_failed: {
    label: "Checkout Failed",
    color: "bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-300",
    icon: XCircle,
  },
  refunded: {
    label: "Refunded",
    color: "bg-gray-100 dark:bg-gray-950/40 text-gray-700 dark:text-gray-300",
    icon: RotateCcw,
  },
}

export const PAYMENT_STATUS: Record<PaymentStatus, StatusConfig> = {
  paid: {
    label: "Paid",
    color: "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300",
    icon: CheckCircle2,
  },
  pending: {
    label: "Pending",
    color: "bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300",
    icon: Clock,
  },
  failed: {
    label: "Failed",
    color: "bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-300",
    icon: XCircle,
  },
}

/** Get status badge classes. Falls back to gray for unknown statuses. */
export function getStatusColor(status: string): string {
  const config = INTAKE_STATUS[status as IntakeStatus]
  return config?.color ?? "bg-gray-100 dark:bg-gray-950/40 text-gray-700 dark:text-gray-300"
}
