/**
 * Repeat Prescription Intake - Step Components
 * 
 * Each step component is under 200 lines and handles a single concern.
 * The flow controller (RepeatRxIntakeFlow) composes these steps.
 * 
 * Architecture:
 * - Each step receives state and update callbacks via props
 * - Steps are stateless UI - all state lives in the parent flow controller
 * - Validation logic is co-located with each step
 * - Steps can be reused across different flows
 */

export { AuthStep } from "./auth-step"
export { MedicationStep } from "./medication-step"
export { HistoryStep } from "./history-step"
export { SafetyStep } from "./safety-step"
export { MedicalHistoryStep } from "./medical-history-step"
export { AttestationStep } from "./attestation-step"
export { ReviewStep } from "./review-step"
export { PaymentStep } from "./payment-step"
export { ConfirmationStep } from "./confirmation-step"

// Shared types for step props
export interface BaseStepProps {
  onNext: () => void
  onBack?: () => void
  isLoading?: boolean
}

// Re-export step types
export type { RepeatRxStep } from "@/types/repeat-rx"
