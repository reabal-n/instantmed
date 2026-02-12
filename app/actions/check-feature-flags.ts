"use server"

/**
 * Server Action: Check Feature Flags
 * 
 * Exposes feature flag status to client components.
 * Use this to check kill switches before rendering flows.
 */

import {
  flags,
  isCheckoutDisabled,
  isConsultSubtypeDisabled,
  isCallRequired,
  mayRequireCall,
  getFlagStatus,
} from "@/lib/config/feature-flags"

export interface FeatureFlagStatus {
  checkoutDisabled: {
    med_cert: boolean
    prescription: boolean
    consult: boolean
  }
  employerEmailDisabled: boolean
  forceCallRequired: boolean
  disabledConsultSubtypes: string[]
}

/**
 * Get current feature flag status for client-side UI decisions.
 */
export async function getFeatureFlagStatus(): Promise<FeatureFlagStatus> {
  return {
    checkoutDisabled: {
      med_cert: flags.DISABLE_CHECKOUT_MED_CERT,
      prescription: flags.DISABLE_CHECKOUT_PRESCRIPTION,
      consult: flags.DISABLE_CHECKOUT_CONSULT,
    },
    employerEmailDisabled: flags.DISABLE_EMPLOYER_EMAIL,
    forceCallRequired: flags.FORCE_CALL_REQUIRED,
    disabledConsultSubtypes: flags.DISABLE_CONSULT_SUBTYPES
      ? flags.DISABLE_CONSULT_SUBTYPES.split(",").map(s => s.trim()).filter(Boolean)
      : [],
  }
}

/**
 * Check if a specific service checkout is disabled.
 */
export async function checkServiceDisabled(category: string, subtype?: string): Promise<{
  disabled: boolean
  message?: string
}> {
  if (isCheckoutDisabled(category)) {
    return {
      disabled: true,
      message: "This service is temporarily unavailable. Please try again later.",
    }
  }

  if (subtype && isConsultSubtypeDisabled(subtype)) {
    return {
      disabled: true,
      message: "This service is temporarily unavailable. Please try again later.",
    }
  }

  return { disabled: false }
}

/**
 * Check if a consult requires or may require a call.
 * 
 * Returns:
 * - required: true if call is mandatory (e.g., weight_loss when FORCE_CALL_REQUIRED is on)
 * - mayBeRequired: true if call may be required (collect availability)
 */
export async function checkConsultCallRequirement(subtype?: string): Promise<{
  required: boolean
  mayBeRequired: boolean
  message?: string
}> {
  const required = isCallRequired(subtype)
  const mayBeRequired = mayRequireCall(subtype)

  if (required) {
    return {
      required: true,
      mayBeRequired: true,
      message: "This consultation requires a phone call with a doctor.",
    }
  }

  if (mayBeRequired) {
    return {
      required: false,
      mayBeRequired: true,
      message: "A phone call may be required. Please provide your availability.",
    }
  }

  return {
    required: false,
    mayBeRequired: false,
  }
}

/**
 * Get all flag status (for admin display).
 */
export async function getAdminFlagStatus(): Promise<Record<string, boolean | string>> {
  return getFlagStatus()
}
