// ============================================
// SERVICE-RELATED TYPES
// ============================================
// Canonical service type definitions shared across
// components/request/, lib/request/, app/actions/, and lib/stripe/.
// Import from "@/types/services" -- do NOT duplicate these.

/**
 * Service types for the unified /request intake flow.
 * These map to the URL parameter: /request?service=<UnifiedServiceType>
 *
 * Used by:
 * - lib/request/step-registry.ts (step definitions)
 * - components/request/ (all step components)
 * - app/actions/unified-checkout.ts (checkout)
 * - lib/request/display-helpers.ts (labels)
 * - lib/request/draft-storage.ts (persistence)
 */
export type UnifiedServiceType =
  | 'med-cert'
  | 'prescription'
  | 'repeat-script'
  | 'consult'

/**
 * Step IDs used across all intake flows.
 * Each service type uses a subset of these steps.
 */
export type UnifiedStepId =
  | 'service'           // Service selection (optional - skip if pre-selected)
  | 'safety'            // Safety consent (merged into review step)
  | 'certificate'       // Med cert type + duration
  | 'symptoms'          // Symptom selection + details
  | 'medication'        // PBS medication search
  | 'medication-history'// Previous prescriptions + side effects
  | 'medical-history'   // Allergies, conditions, other meds
  | 'consult-reason'    // General consult pathway
  | 'ed-goals'          // ED goals and duration
  | 'ed-assessment'     // ED-specific assessment (IIEF-5)
  | 'ed-health'         // ED health screening (nitrates, cardiac, medical history)
  | 'ed-preferences'    // ED treatment preferences
  | 'hair-loss-assessment' // Hair loss pattern and history
  | 'womens-health-type'   // Women's health sub-selection
  | 'womens-health-assessment' // Women's health specific questions
  | 'weight-loss-assessment'   // Weight loss goals and screening
  | 'weight-loss-call-scheduling' // Weight loss call availability
  | 'details'           // Patient identity + contact
  | 'review'            // Summary before payment
  | 'checkout'          // Payment + final consents

/**
 * Consult subtype keys (used in URL and intake creation).
 * Maps to: /request?service=consult&subtype=<ConsultSubtype>
 *
 * Note: lib/clinical/consult-validators.ts defines a DIFFERENT
 * ConsultSubtype with more granular women's health subtypes.
 * That is intentionally separate for clinical validation.
 */
export type ConsultSubtype =
  | 'general'
  | 'ed'
  | 'hair_loss'
  | 'womens_health'
  | 'weight_loss'

/**
 * Service category for Stripe price mapping.
 * Used by checkout flows to determine which Stripe price ID to use.
 */
export type ServiceCategory = "medical_certificate" | "prescription" | "consult"
