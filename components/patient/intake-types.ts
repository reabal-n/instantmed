import { AlertCircle } from "lucide-react"

import {
  getPatientStatusNextStep,
  INTAKE_STATUS,
  type IntakeStatus,
} from "@/lib/data/status"
import {
  isMoreInformationRequiredPaymentRecovery,
  type PatientPaymentRecoveryReason,
} from "@/lib/patient/payment-recovery"

export interface Intake {
  id: string
  status: string
  payment_status?: string | null
  created_at: string
  updated_at: string
  document_ready?: boolean
  payment_recovery_reason?: PatientPaymentRecoveryReason
  service?: { id: string; name?: string; short_name?: string; type?: string; slug?: string } | null
}

/** Resolve status config from lib/data/status.ts - single source of truth */
export function resolveStatusConfig(status: string) {
  return INTAKE_STATUS[status as IntakeStatus] ?? INTAKE_STATUS.pending
}

export function resolvePatientIntakeStatusConfig(
  intake: Pick<Intake, "status" | "payment_recovery_reason">,
) {
  if (isMoreInformationRequiredPaymentRecovery(intake)) {
    return {
      label: "More information needed",
      color: "bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300",
      icon: AlertCircle,
    }
  }

  return resolveStatusConfig(intake.status)
}

export function resolvePatientIntakeNextStep(
  intake: Pick<Intake, "status" | "payment_recovery_reason">,
) {
  if (isMoreInformationRequiredPaymentRecovery(intake)) {
    return {
      message: "Start a fresh secure form with complete medical answers, or contact support if something looks wrong.",
      actionLabel: "View options",
    }
  }

  return getPatientStatusNextStep(intake.status)
}
