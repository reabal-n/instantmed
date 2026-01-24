/**
 * Shared Intake Components
 * 
 * Reusable components for all intake flows (med-cert, repeat-rx, consults).
 * These ensure consistency in UI, behavior, and compliance across flows.
 */

// Safety & Emergency
export { EmergencyGate } from "../emergency-gate"

// Checkout
export { CheckoutButton, CheckoutSection } from "../checkout-button"
export type { CheckoutButtonProps } from "../checkout-button"

// Re-export symptom checker utilities
export { 
  checkSymptoms, 
  SymptomChecker, 
  EmergencyDialog,
  RedFlagBadge,
  RED_FLAG_SYMPTOMS,
  YELLOW_FLAG_SYMPTOMS,
} from "@/components/shared/symptom-checker"
