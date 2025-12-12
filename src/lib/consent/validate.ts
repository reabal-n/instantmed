import { createClient } from '@/lib/supabase/server'
import type { ConsentType } from '@/types/database'
import type { ConsentValidationResult } from './types'
import { getRequiredConsents } from './definitions'

// ============================================
// SERVER-SIDE CONSENT VALIDATION
// ============================================

/**
 * Validate that all required consents have been given for an intake
 * This MUST be called before allowing submission
 */
export async function validateIntakeConsents(
  intakeId: string,
  serviceType: string
): Promise<ConsentValidationResult> {
  const supabase = await createClient()
  
  // Get required consents for this service type
  const requiredConsents = getRequiredConsents(serviceType)
  const requiredTypes = requiredConsents.map((c) => c.type)

  // Fetch existing consents for this intake
  const { data: existingConsents, error } = await supabase
    .from('consents')
    .select('consent_type, is_granted, consent_version')
    .eq('intake_id', intakeId)
    .eq('is_granted', true)

  if (error) {
    return {
      isValid: false,
      missingConsents: requiredTypes,
      errors: [`Failed to fetch consents: ${error.message}`],
    }
  }

  // Check for missing consents
  const grantedTypes = new Set(existingConsents?.map((c) => c.consent_type) || [])
  const missingConsents: ConsentType[] = []
  const errors: string[] = []

  for (const required of requiredConsents) {
    if (!grantedTypes.has(required.type)) {
      missingConsents.push(required.type)
      errors.push(`Missing required consent: ${required.title}`)
    }
  }

  return {
    isValid: missingConsents.length === 0,
    missingConsents,
    errors,
  }
}

/**
 * Enforce consent validation - throws if invalid
 * Use this in API routes to block submission
 */
export async function enforceConsents(
  intakeId: string,
  serviceType: string
): Promise<void> {
  const result = await validateIntakeConsents(intakeId, serviceType)
  
  if (!result.isValid) {
    throw new Error(
      `Consent validation failed: ${result.errors.join(', ')}`
    )
  }
}

/**
 * Record a consent grant
 */
export async function recordConsent(params: {
  intakeId: string
  patientId: string
  consentType: ConsentType
  version: string
  textHash: string
  clientIp?: string
  clientUserAgent?: string
}): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  const { error } = await supabase.from('consents').upsert(
    {
      intake_id: params.intakeId,
      patient_id: params.patientId,
      consent_type: params.consentType,
      consent_version: params.version,
      consent_text_hash: params.textHash,
      is_granted: true,
      granted_at: new Date().toISOString(),
      client_ip: params.clientIp,
      client_user_agent: params.clientUserAgent,
    },
    {
      onConflict: 'intake_id,consent_type',
    }
  )

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true }
}

/**
 * Record multiple consents at once
 */
export async function recordConsents(params: {
  intakeId: string
  patientId: string
  consents: Array<{
    type: ConsentType
    version: string
    textHash: string
  }>
  clientIp?: string
  clientUserAgent?: string
}): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  const records = params.consents.map((consent) => ({
    intake_id: params.intakeId,
    patient_id: params.patientId,
    consent_type: consent.type,
    consent_version: consent.version,
    consent_text_hash: consent.textHash,
    is_granted: true,
    granted_at: new Date().toISOString(),
    client_ip: params.clientIp,
    client_user_agent: params.clientUserAgent,
  }))

  const { error } = await supabase.from('consents').upsert(records, {
    onConflict: 'intake_id,consent_type',
  })

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true }
}

/**
 * Revoke a consent (for audit purposes - doesn't delete)
 */
export async function revokeConsent(
  intakeId: string,
  consentType: ConsentType
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('consents')
    .update({
      revoked_at: new Date().toISOString(),
    })
    .eq('intake_id', intakeId)
    .eq('consent_type', consentType)

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true }
}
