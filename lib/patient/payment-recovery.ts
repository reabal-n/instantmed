import { isMissingSafetyInformationPaymentLock } from "@/lib/stripe/payment-safety-lock"

export const MORE_INFORMATION_REQUIRED_RECOVERY = "more_information_required" as const

export type PatientPaymentRecoveryReason =
  | typeof MORE_INFORMATION_REQUIRED_RECOVERY
  | null

export interface PatientPaymentRecoveryProjection {
  payment_recovery_reason: PatientPaymentRecoveryReason
}

export function derivePatientPaymentRecoveryReason(
  checkoutError: unknown,
): PatientPaymentRecoveryReason {
  return isMissingSafetyInformationPaymentLock(checkoutError)
    ? MORE_INFORMATION_REQUIRED_RECOVERY
    : null
}

export function isMoreInformationRequiredPaymentRecovery(
  intake: { status: string; payment_recovery_reason?: PatientPaymentRecoveryReason },
): boolean {
  return intake.status === "checkout_failed" &&
    intake.payment_recovery_reason === MORE_INFORMATION_REQUIRED_RECOVERY
}
