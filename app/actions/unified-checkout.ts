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

interface UnifiedCheckoutInput {
  serviceType: UnifiedServiceType
  answers: Record<string, unknown>
  identity: {
    email?: string
    fullName?: string
    dateOfBirth?: string
    phone?: string
  }
}

interface CheckoutResult {
  success: boolean
  checkoutUrl?: string
  intakeId?: string
  error?: string
}

/**
 * Map unified service type to Stripe category and subtype
 */
function mapServiceToCategory(serviceType: UnifiedServiceType): { category: ServiceCategory; subtype: string } {
  const mapping: Record<UnifiedServiceType, { category: ServiceCategory; subtype: string }> = {
    'med-cert': { category: 'medical_certificate', subtype: 'work' },
    'prescription': { category: 'prescription', subtype: 'new' },
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
    transformed.medication_strength = answers.medicationStrength
    transformed.medication_form = answers.medicationForm
    transformed.pbs_code = answers.pbsCode
    transformed.prescription_history = answers.prescriptionHistory
    transformed.last_prescription_date = answers.lastPrescriptionDate
    transformed.side_effects = answers.sideEffects
  }
  
  // Map consult specific fields
  if (serviceType === 'consult') {
    transformed.consult_category = answers.consultCategory
    transformed.consult_details = answers.consultDetails
    transformed.consult_urgency = answers.consultUrgency
  }
  
  // Map shared medical history fields
  transformed.has_allergies = answers.hasAllergies
  transformed.allergies = answers.allergies
  transformed.has_conditions = answers.hasConditions
  transformed.conditions = answers.conditions
  transformed.other_medications = answers.otherMedications
  
  return transformed
}

/**
 * Create checkout session from unified flow data
 */
export async function createCheckoutFromUnifiedFlow(
  input: UnifiedCheckoutInput
): Promise<CheckoutResult> {
  const { serviceType, answers, identity } = input
  const { category, subtype } = mapServiceToCategory(serviceType)
  
  // Update subtype based on answers for med-cert
  let finalSubtype = subtype
  if (serviceType === 'med-cert' && answers.certType) {
    finalSubtype = String(answers.certType)
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
      idempotencyKey: crypto.randomUUID(),
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
