/**
 * Legal Attestation System
 * 
 * ADVERSARIAL_SECURITY_AUDIT Critical #1: Add attestation language with legal weight
 * 
 * Implements typed confirmation attestations to deter fraud through legal liability.
 * All attestations are logged with IP address and timestamp for audit trail.
 */

import { createServiceRoleClient } from "@/lib/supabase/service-role"

export interface AttestationData {
  text: string
  typedName: string
  timestamp: string
  ipAddress: string
  userAgent?: string
}

export interface AttestationResult {
  valid: boolean
  attestationId?: string
  error?: string
}

// Standard attestation texts
export const ATTESTATION_TEXTS = {
  MEDICAL_CERTIFICATE: `I declare that the symptoms and information I have provided are true and accurate to the best of my knowledge. I understand that:
• Providing false information to obtain a medical certificate may constitute fraud
• Medical certificates may be verified by employers
• False declarations may result in legal consequences and account termination
• This information will be reviewed by a registered medical practitioner`,

  REPEAT_PRESCRIPTION: `I declare that:
• I have been taking this medication as prescribed by a doctor
• The information about my treatment history is true and accurate
• I have not obtained this medication from another provider in the past 30 days
• I understand that providing false information may result in legal consequences
• A pharmacist may verify this prescription against my medication history`,

  GENERAL_CONSULT: `I confirm that the information I have provided is true and accurate to the best of my knowledge. I understand that providing false information may affect the quality of care I receive and may have legal consequences.`,

  ACCURACY_ATTESTATION: `I confirm that all information provided in this request is true, complete, and accurate to the best of my knowledge. I understand that providing false or misleading information may constitute fraud.`,
} as const

/**
 * Validate attestation data
 */
export function validateAttestation(
  attestation: AttestationData,
  expectedName: string,
  attestationType: keyof typeof ATTESTATION_TEXTS
): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  // Check typed name matches expected name (case-insensitive, trimmed)
  const normalizedTyped = attestation.typedName.trim().toLowerCase()
  const normalizedExpected = expectedName.trim().toLowerCase()
  
  if (normalizedTyped !== normalizedExpected) {
    errors.push("Typed name does not match your registered name")
  }

  // Check typed name is not empty
  if (!attestation.typedName.trim()) {
    errors.push("You must type your full name to confirm")
  }

  // Check attestation text matches expected
  if (attestation.text !== ATTESTATION_TEXTS[attestationType]) {
    errors.push("Attestation text mismatch - please try again")
  }

  // Check timestamp is recent (within last 10 minutes)
  const attestationTime = new Date(attestation.timestamp)
  const now = new Date()
  const diffMinutes = (now.getTime() - attestationTime.getTime()) / (1000 * 60)
  
  if (diffMinutes > 10) {
    errors.push("Attestation has expired - please confirm again")
  }

  // Check IP address is present
  if (!attestation.ipAddress) {
    errors.push("Unable to verify request origin")
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Save attestation to audit log
 */
export async function saveAttestation(
  requestId: string,
  requestType: string,
  patientId: string,
  attestation: AttestationData,
  attestationType: keyof typeof ATTESTATION_TEXTS
): Promise<AttestationResult> {
  try {
    const supabase = createServiceRoleClient()

    const { data, error } = await supabase
      .from("audit_log")
      .insert({
        event_type: "attestation_signed",
        request_id: requestId,
        request_type: requestType,
        patient_id: patientId,
        details: {
          attestationType,
          typedName: attestation.typedName,
          attestationText: attestation.text.substring(0, 200) + "...", // Truncate for storage
          ipAddress: attestation.ipAddress,
          userAgent: attestation.userAgent,
        },
        ip_address: attestation.ipAddress,
        created_at: attestation.timestamp,
      })
      .select("id")
      .single()

    if (error) {
      return { valid: false, error: "Failed to record attestation" }
    }

    return { valid: true, attestationId: data.id }
  } catch (_error) {
    return { valid: false, error: "System error recording attestation" }
  }
}

/**
 * Create attestation data from request
 */
export function createAttestationData(
  typedName: string,
  attestationType: keyof typeof ATTESTATION_TEXTS,
  ipAddress: string,
  userAgent?: string
): AttestationData {
  return {
    text: ATTESTATION_TEXTS[attestationType],
    typedName,
    timestamp: new Date().toISOString(),
    ipAddress,
    userAgent,
  }
}
