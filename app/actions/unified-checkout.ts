"use server"

/**
 * Unified Checkout Action
 * 
 * Bridges the new unified /request flow to existing checkout infrastructure.
 * Handles both authenticated and guest checkout flows.
 */

import crypto from "crypto"

import { getAuthenticatedUserWithProfile } from "@/lib/auth/helpers"
import {
  resolveCheckoutSubtype,
  transformAnswersForUnifiedCheckout,
  validateAnswersServerSide,
} from "@/lib/request/unified-checkout"
import { createIntakeAndCheckoutAction } from "@/lib/stripe/checkout"
import { createGuestCheckoutAction } from "@/lib/stripe/guest-checkout"
import type { ServiceCategory,UnifiedServiceType } from "@/types/services"

interface UnifiedCheckoutInput {
  serviceType: UnifiedServiceType
  answers: Record<string, unknown>
  identity: {
    email?: string
    fullName?: string
    dateOfBirth?: string
    phone?: string
  }
  attribution?: {
    gclid?: string
    gbraid?: string
    wbraid?: string
    utm_source?: string
    utm_medium?: string
    utm_campaign?: string
    utm_content?: string
    utm_term?: string
    referrer?: string
    landing_page?: string
    captured_at?: string
  }
  posthogDistinctId?: string
}

interface CheckoutResult {
  success: boolean
  checkoutUrl?: string
  intakeId?: string
  error?: string
}

/**
 * Map unified service type to Stripe category and subtype
 * 
 * IMPORTANT: Both 'prescription' and 'repeat-script' map to subtype: 'repeat'
 * which routes to the 'common-scripts' service (type: common_scripts).
 * This ensures the doctor RepeatPrescriptionChecklist renders correctly.
 * 
 * For NEW prescriptions (not repeats), use 'consult' service type instead.
 */
function mapServiceToCategory(serviceType: UnifiedServiceType): { category: ServiceCategory; subtype: string } {
  const mapping: Record<UnifiedServiceType, { category: ServiceCategory; subtype: string }> = {
    'med-cert': { category: 'medical_certificate', subtype: 'work' },
    'prescription': { category: 'prescription', subtype: 'repeat' },
    'repeat-script': { category: 'prescription', subtype: 'repeat' },
    'consult': { category: 'consult', subtype: 'general' },
  }
  return mapping[serviceType] || mapping['med-cert']
}

/**
 * Create checkout session from unified flow data
 */
export async function createCheckoutFromUnifiedFlow(
  input: UnifiedCheckoutInput
): Promise<CheckoutResult> {
  const { serviceType, answers, identity, attribution, posthogDistinctId } = input
  const { category, subtype } = mapServiceToCategory(serviceType)
  
  // Update subtype based on answers
  const finalSubtype = resolveCheckoutSubtype(serviceType, answers, subtype)
  
  // Server-side validation before proceeding to checkout
  const validationError = validateAnswersServerSide(serviceType, answers, identity)
  if (validationError) {
    return { success: false, error: validationError }
  }

  const transformedAnswers = transformAnswersForUnifiedCheckout(serviceType, answers)

  // Check if user is authenticated
  const authResult = await getAuthenticatedUserWithProfile()
  
  if (authResult?.user && authResult?.profile) {
    // Authenticated checkout
    return createIntakeAndCheckoutAction({
      category,
      subtype: finalSubtype,
      type: serviceType,
      answers: transformedAnswers,
      // Idempotency key prevents duplicate intakes from double-clicks/retries.
      // Uses a 10-minute time bucket so:
      //   - Rapid double-clicks (same bucket) → deduplicated ✓
      //   - Legitimate repeat requests (different bucket) → new intake ✓
      idempotencyKey: crypto
        .createHash("sha256")
        .update(`${authResult.profile.id}:${serviceType}:${finalSubtype}:${Math.floor(Date.now() / 600_000)}:${JSON.stringify(transformedAnswers)}`)
        .digest("hex")
        .slice(0, 32),
      attribution,
      posthogDistinctId,
    })
  } else {
    // Guest checkout - requires identity info
    if (!identity.email) {
      return {
        success: false,
        error: 'Email is required for guest checkout',
      }
    }
    
    // Phone required for prescriptions (eScript SMS delivery) and consult callbacks.
    if ((serviceType === 'prescription' || serviceType === 'repeat-script' || serviceType === 'consult') && !identity.phone) {
      return {
        success: false,
        error: serviceType === 'consult'
          ? 'Phone number is required so the doctor can contact you about your consultation.'
          : 'Phone number is required for prescription requests to receive your eScript via SMS.',
      }
    }
    
    return createGuestCheckoutAction({
      category,
      subtype: finalSubtype,
      type: serviceType,
      answers: transformedAnswers,
      guestEmail: identity.email,
      guestName: identity.fullName,
      guestDateOfBirth: identity.dateOfBirth,
      guestPhone: identity.phone,
      attribution,
      posthogDistinctId,
    })
  }
}
