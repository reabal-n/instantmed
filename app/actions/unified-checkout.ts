"use server"

/**
 * Unified Checkout Action
 * 
 * Bridges the new unified /request flow to existing checkout infrastructure.
 * Handles both authenticated and guest checkout flows.
 */

import { createIntakeAndCheckoutAction } from "@/lib/stripe/checkout"
import { createGuestCheckoutAction } from "@/lib/stripe/guest-checkout"
import { getAuthenticatedUserWithProfile } from "@/lib/auth"
import type { UnifiedServiceType } from "@/lib/request/step-registry"
import type { ServiceCategory } from "@/lib/stripe/client"
import crypto from "crypto"

interface UnifiedCheckoutInput {
  serviceType: UnifiedServiceType
  answers: Record<string, unknown>
  identity: {
    email?: string
    fullName?: string
    dateOfBirth?: string
    phone?: string
  }
  chatSessionId?: string // Session ID from AI chat flow for transcript linking
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
 * Transform unified flow answers to expected checkout format
 */
function transformAnswers(
  serviceType: UnifiedServiceType, 
  answers: Record<string, unknown>
): Record<string, unknown> {
  const transformed: Record<string, unknown> = { ...answers }
  
  // Map med-cert specific fields
  if (serviceType === 'med-cert') {
    transformed.certificate_type = answers.certType
    transformed.duration = answers.duration
    transformed.start_date = answers.startDate
    transformed.symptoms = answers.symptoms
    transformed.symptom_details = answers.symptomDetails
    transformed.symptom_duration = answers.symptomDuration
    transformed.employer_name = answers.employerName
  }
  
  // Map prescription specific fields
  if (serviceType === 'prescription' || serviceType === 'repeat-script') {
    transformed.medication_name = answers.medicationName
    transformed.medication_display = answers.medicationName // Alias for validation
    transformed.medication_strength = answers.medicationStrength
    transformed.medication_form = answers.medicationForm
    transformed.pbs_code = answers.pbsCode
    transformed.amt_code = answers.pbsCode // Alias for validation compatibility
    // Map prescriptionHistory to last_prescribed for server-side validation
    transformed.last_prescribed = answers.prescriptionHistory
    transformed.prescription_history = answers.prescriptionHistory
    transformed.last_prescription_date = answers.lastPrescriptionDate
    transformed.side_effects = answers.sideEffects
    // Gating fields required by validation (inferred from flow logic)
    // If user reached checkout via repeat-script flow, they confirmed it's a repeat
    transformed.prescribed_before = answers.prescribedBefore ?? true
    transformed.dose_changed = answers.doseChanged ?? false
  }
  
  // Map consult specific fields
  if (serviceType === 'consult') {
    transformed.consult_category = answers.consultCategory
    transformed.consult_subtype = answers.consultSubtype
    transformed.consult_details = answers.consultDetails
    transformed.consult_urgency = answers.consultUrgency
  }
  
  // Map shared medical history fields
  transformed.has_allergies = answers.hasAllergies
  transformed.allergies = answers.allergies
  transformed.has_conditions = answers.hasConditions
  transformed.conditions = answers.conditions
  transformed.other_medications = answers.otherMedications
  
  // Map consent fields for server-side validation
  transformed.telehealth_consent_given = answers.telehealthConsentGiven
  transformed.accuracy_confirmed = answers.confirmedAccuracy
  transformed.terms_agreed = answers.agreedToTerms
  
  return transformed
}

/**
 * Create checkout session from unified flow data
 */
export async function createCheckoutFromUnifiedFlow(
  input: UnifiedCheckoutInput
): Promise<CheckoutResult> {
  const { serviceType, answers, identity, chatSessionId } = input
  const { category, subtype } = mapServiceToCategory(serviceType)
  
  // Update subtype based on answers
  let finalSubtype = subtype
  if (serviceType === 'med-cert' && answers.certType) {
    finalSubtype = String(answers.certType)
  }
  // For consults, use the category from answers (e.g., 'new_medication', 'ed', 'general')
  if (serviceType === 'consult') {
    if (answers.consultCategory) {
      finalSubtype = String(answers.consultCategory)
    } else if (answers.consultSubtype) {
      finalSubtype = String(answers.consultSubtype)
    }
  }
  
  // DEV: Debug log for prescription flow tracing (no PHI)
  if (process.env.NODE_ENV === 'development') {
    // eslint-disable-next-line no-console
    console.log('[UnifiedCheckout] Mapping:', {
      inputServiceType: serviceType,
      mappedCategory: category,
      mappedSubtype: finalSubtype,
      // Service slug will be: prescription:repeat -> common-scripts
    })
  }
  
  const transformedAnswers = transformAnswers(serviceType, answers)
  
  // Check if user is authenticated
  const authResult = await getAuthenticatedUserWithProfile()
  
  if (authResult?.user && authResult?.profile) {
    // Authenticated checkout
    return createIntakeAndCheckoutAction({
      category,
      subtype: finalSubtype,
      type: serviceType,
      answers: transformedAnswers,
      idempotencyKey: crypto
        .createHash("sha256")
        .update(`${authResult.profile.id}:${serviceType}:${finalSubtype}:${JSON.stringify(transformedAnswers)}`)
        .digest("hex")
        .slice(0, 32),
      chatSessionId, // Pass chat session ID for transcript linking
    })
  } else {
    // Guest checkout - requires identity info
    if (!identity.email) {
      return {
        success: false,
        error: 'Email is required for guest checkout',
      }
    }
    
    // Phone required for prescriptions (eScript SMS delivery)
    if ((serviceType === 'prescription' || serviceType === 'repeat-script') && !identity.phone) {
      return {
        success: false,
        error: 'Phone number is required for prescription requests to receive your eScript via SMS.',
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
    })
  }
}
