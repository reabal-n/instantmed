/**
 * Certificate Default Text
 *
 * Single source of truth for default certificate config.
 * The PDF renderer uses certificateType ("work" | "study" | "carer") to generate
 * the correct title and body text dynamically — this file provides the admin
 * studio display defaults only.
 */

export interface CertificateTextConfig {
  title: string
  attestation: string
  notes: string | null
  restrictions: string | null
}

export interface SealConfig {
  show: boolean
  size: "sm" | "md" | "lg"
}

// Character limits for validation
export const TEXT_LIMITS = {
  title: 100,
  attestation: 800,
  notes: 400,
  restrictions: 400,
} as const

// Seal size values in pixels
export const SEAL_SIZE_VALUES: Record<SealConfig["size"], number> = {
  sm: 60,
  md: 80,
  lg: 100,
}

// Default seal configuration
export const DEFAULT_SEAL_CONFIG: SealConfig = {
  show: true,
  size: "sm",
}

// Default template text config (single template)
export const DEFAULT_CERTIFICATE_TEXT: CertificateTextConfig = {
  title: "Medical Certificate",
  attestation:
    "This is to certify that the above-named patient has been reviewed and assessed via telehealth consultation. In my clinical opinion, they are medically unfit to attend work or fulfil their usual duties for the period specified above.",
  notes: null,
  restrictions: null,
}

/**
 * Get certificate text with fallback to defaults
 */
export function getCertificateTextWithDefaults(
  customText?: Partial<CertificateTextConfig> | null
): CertificateTextConfig {
  if (!customText) return DEFAULT_CERTIFICATE_TEXT
  return {
    title: customText.title || DEFAULT_CERTIFICATE_TEXT.title,
    attestation: customText.attestation || DEFAULT_CERTIFICATE_TEXT.attestation,
    notes: customText.notes ?? DEFAULT_CERTIFICATE_TEXT.notes,
    restrictions: customText.restrictions ?? DEFAULT_CERTIFICATE_TEXT.restrictions,
  }
}

/**
 * Get seal config with fallback to defaults
 */
export function getSealConfigWithDefaults(
  customSeal?: Partial<SealConfig> | null
): SealConfig {
  if (!customSeal) return DEFAULT_SEAL_CONFIG
  return {
    show: customSeal.show ?? DEFAULT_SEAL_CONFIG.show,
    size: customSeal.size ?? DEFAULT_SEAL_CONFIG.size,
  }
}

/**
 * Validate certificate text fields
 */
export function validateCertificateText(text: CertificateTextConfig): {
  valid: boolean
  errors: Record<string, string>
} {
  const errors: Record<string, string> = {}

  if (!text.title || text.title.trim().length === 0) {
    errors.title = "Title is required"
  } else if (text.title.length > TEXT_LIMITS.title) {
    errors.title = `Title must be ${TEXT_LIMITS.title} characters or less`
  }

  if (!text.attestation || text.attestation.trim().length === 0) {
    errors.attestation = "Attestation text is required"
  } else if (text.attestation.length > TEXT_LIMITS.attestation) {
    errors.attestation = `Attestation must be ${TEXT_LIMITS.attestation} characters or less`
  }

  if (text.notes && text.notes.length > TEXT_LIMITS.notes) {
    errors.notes = `Notes must be ${TEXT_LIMITS.notes} characters or less`
  }

  if (text.restrictions && text.restrictions.length > TEXT_LIMITS.restrictions) {
    errors.restrictions = `Restrictions must be ${TEXT_LIMITS.restrictions} characters or less`
  }

  return { valid: Object.keys(errors).length === 0, errors }
}

/**
 * Convert newlines to paragraph breaks for rendering
 */
export function textToParagraphs(text: string): string[] {
  return text.split("\n").filter((p) => p.trim().length > 0)
}
