import "server-only"

/**
 * Feature Flags (Kill Switches)
 * 
 * Environment variable-based feature flags for disabling critical flows.
 * All flags are server-side only to prevent exposure of internal config.
 * 
 * Usage:
 *   import { flags, isCheckoutDisabled, isConsultSubtypeDisabled } from "@/lib/config/feature-flags"
 *   
 *   if (flags.DISABLE_CHECKOUT_MED_CERT) { ... }
 *   if (isCheckoutDisabled("med_certs")) { ... }
 * 
 * To disable a flow quickly:
 *   - Set the env var in Vercel dashboard or .env.local
 *   - Redeploy (or restart dev server locally)
 *   - Flow will show "Service temporarily unavailable"
 * 
 * @see SECURITY.md → Feature Flags & Kill Switches
 */

import * as Sentry from "@sentry/nextjs"
import { createLogger } from "@/lib/observability/logger"

const logger = createLogger("feature-flags")

// ============================================================================
// FLAG DEFINITIONS
// ============================================================================

/**
 * All feature flags.
 * Read once at module load for consistency within a request.
 */
export const flags = {
  // Checkout kill switches
  DISABLE_CHECKOUT_MED_CERT: process.env.DISABLE_CHECKOUT_MED_CERT === "true",
  DISABLE_CHECKOUT_PRESCRIPTION: process.env.DISABLE_CHECKOUT_PRESCRIPTION === "true",
  DISABLE_CHECKOUT_CONSULT: process.env.DISABLE_CHECKOUT_CONSULT === "true",
  
  // Email kill switches
  DISABLE_EMPLOYER_EMAIL: process.env.DISABLE_EMPLOYER_EMAIL === "true",
  
  // Consult flow modifiers
  FORCE_CALL_REQUIRED: process.env.FORCE_CALL_REQUIRED === "true",
  
  // Comma-separated list of disabled consult subtypes
  // e.g., "weight_loss,mens_health"
  DISABLE_CONSULT_SUBTYPES: process.env.DISABLE_CONSULT_SUBTYPES || "",
  
  // Ops kill switches (from previous implementations)
  DISABLE_INTAKE_EVENTS: process.env.DISABLE_INTAKE_EVENTS === "true",
  DISABLE_STUCK_INTAKE_SENTRY: process.env.DISABLE_STUCK_INTAKE_SENTRY === "true",
  DISABLE_RECONCILIATION_SENTRY: process.env.DISABLE_RECONCILIATION_SENTRY === "true",
} as const

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Check if checkout is disabled for a given service category.
 */
export function isCheckoutDisabled(category: string): boolean {
  const normalizedCategory = category.toLowerCase().replace(/_/g, "")
  
  if (normalizedCategory.includes("medcert") || normalizedCategory.includes("medicalcertificate") || category === "med_certs") {
    return flags.DISABLE_CHECKOUT_MED_CERT
  }
  
  if (normalizedCategory.includes("prescription") || normalizedCategory.includes("script") || category === "common_scripts") {
    return flags.DISABLE_CHECKOUT_PRESCRIPTION
  }
  
  if (normalizedCategory.includes("consult") || normalizedCategory.includes("weightloss") || normalizedCategory.includes("menshealth")) {
    return flags.DISABLE_CHECKOUT_CONSULT
  }
  
  return false
}

/**
 * Check if a specific consult subtype is disabled.
 */
export function isConsultSubtypeDisabled(subtype: string): boolean {
  if (!flags.DISABLE_CONSULT_SUBTYPES) return false
  
  const disabledSubtypes = flags.DISABLE_CONSULT_SUBTYPES
    .split(",")
    .map(s => s.trim().toLowerCase())
    .filter(Boolean)
  
  return disabledSubtypes.includes(subtype.toLowerCase())
}

/**
 * Get list of disabled consult subtypes.
 */
export function getDisabledConsultSubtypes(): string[] {
  if (!flags.DISABLE_CONSULT_SUBTYPES) return []
  
  return flags.DISABLE_CONSULT_SUBTYPES
    .split(",")
    .map(s => s.trim())
    .filter(Boolean)
}

/**
 * Check if call is required for a consult subtype.
 * 
 * If FORCE_CALL_REQUIRED is true:
 * - weight_loss: call is required
 * - other subtypes: call may be required (collect availability)
 */
export function isCallRequired(subtype?: string): boolean {
  if (!flags.FORCE_CALL_REQUIRED) return false
  
  // Weight loss always requires call when flag is on
  if (subtype?.toLowerCase() === "weight_loss") {
    return true
  }
  
  return false
}

/**
 * Check if call may be required (show availability collection).
 */
export function mayRequireCall(_subtype?: string): boolean {
  if (!flags.FORCE_CALL_REQUIRED) return false
  
  // All consults may require call when flag is on
  return true
}

// ============================================================================
// BLOCKING HELPERS WITH SENTRY
// ============================================================================

export interface BlockedFlowResult {
  blocked: true
  reason: string
  userMessage: string
}

export interface AllowedFlowResult {
  blocked: false
}

export type FlowCheckResult = BlockedFlowResult | AllowedFlowResult

/**
 * Check if checkout should be blocked and log to Sentry if so.
 */
export function checkCheckoutBlocked(
  category: string,
  subtype?: string
): FlowCheckResult {
  // Check category-level block
  if (isCheckoutDisabled(category)) {
    logFlowBlocked("checkout", category, subtype, "category_disabled")
    return {
      blocked: true,
      reason: "category_disabled",
      userMessage: "This service is temporarily unavailable. Please try again later.",
    }
  }
  
  // Check subtype-level block for consults
  if (subtype && isConsultSubtypeDisabled(subtype)) {
    logFlowBlocked("checkout", category, subtype, "subtype_disabled")
    return {
      blocked: true,
      reason: "subtype_disabled",
      userMessage: "This service is temporarily unavailable. Please try again later.",
    }
  }
  
  return { blocked: false }
}

/**
 * Check if employer email should be blocked.
 */
export function checkEmployerEmailBlocked(): FlowCheckResult {
  if (flags.DISABLE_EMPLOYER_EMAIL) {
    logFlowBlocked("employer_email", "med_certs", undefined, "employer_email_disabled")
    return {
      blocked: true,
      reason: "employer_email_disabled",
      userMessage: "Employer email is temporarily unavailable. Your certificate is still valid.",
    }
  }
  
  return { blocked: false }
}

// ============================================================================
// SENTRY LOGGING
// ============================================================================

function logFlowBlocked(
  flow: string,
  serviceType: string,
  subtype: string | undefined,
  reason: string
): void {
  logger.warn("[FeatureFlags] Flow blocked", {
    flow,
    serviceType,
    subtype,
    reason,
  })
  
  Sentry.addBreadcrumb({
    category: "feature-flag",
    message: `Flow blocked: ${flow}`,
    level: "warning",
    data: {
      flow,
      service_type: serviceType,
      consult_subtype: subtype || "none",
      reason,
    },
  })
  
  // Capture event for visibility (not an error, just info)
  Sentry.captureMessage(`Kill switch activated: ${flow}`, {
    level: "info",
    tags: {
      flow,
      service_type: serviceType,
      consult_subtype: subtype || "none",
      kill_switch_reason: reason,
    },
    fingerprint: ["kill-switch", flow, serviceType],
  })
}

// ============================================================================
// DEBUG/ADMIN HELPERS
// ============================================================================

/**
 * Get current flag status for admin visibility.
 */
export function getFlagStatus(): Record<string, boolean | string> {
  return {
    DISABLE_CHECKOUT_MED_CERT: flags.DISABLE_CHECKOUT_MED_CERT,
    DISABLE_CHECKOUT_PRESCRIPTION: flags.DISABLE_CHECKOUT_PRESCRIPTION,
    DISABLE_CHECKOUT_CONSULT: flags.DISABLE_CHECKOUT_CONSULT,
    DISABLE_EMPLOYER_EMAIL: flags.DISABLE_EMPLOYER_EMAIL,
    FORCE_CALL_REQUIRED: flags.FORCE_CALL_REQUIRED,
    DISABLE_CONSULT_SUBTYPES: flags.DISABLE_CONSULT_SUBTYPES || "(none)",
  }
}
