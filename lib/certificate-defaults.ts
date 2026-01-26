/**
 * Certificate Default Text
 * 
 * Single source of truth for default certificate text per type.
 * Used by both the Template Studio UI and PDF rendering.
 */

export type CertificateTextType = "work" | "study" | "carer"

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

// Default text for each certificate type
export const DEFAULT_CERTIFICATE_TEXT: Record<CertificateTextType, CertificateTextConfig> = {
  work: {
    title: "Medical Certificate",
    attestation: "This is to certify that the above-named patient has been assessed by me via telehealth consultation. In my professional medical opinion, the patient is/was unfit for work for the period specified above due to the stated medical condition.\n\nThis certificate is issued in accordance with applicable medical standards and workplace health requirements.",
    notes: null,
    restrictions: null,
  },
  study: {
    title: "Medical Certificate",
    attestation: "This is to certify that the above-named patient has been assessed by me via telehealth consultation. In my professional medical opinion, the patient is/was unfit to attend their educational institution or complete academic assessments for the period specified above due to the stated medical condition.\n\nThis certificate is issued in accordance with applicable medical standards and may be used to support applications for special consideration or academic adjustments.",
    notes: null,
    restrictions: null,
  },
  carer: {
    title: "Carer's Leave Certificate",
    attestation: "This is to certify that the above-named patient requires time away from work to provide care or support to an immediate family member or household member who requires care due to a personal illness, injury, or unexpected emergency.\n\nThis certificate is issued in accordance with the Fair Work Act 2009 provisions for carer's leave.",
    notes: null,
    restrictions: null,
  },
}

/**
 * Map template type to certificate text type
 */
export function templateTypeToCertType(templateType: string): CertificateTextType {
  switch (templateType) {
    case "med_cert_work":
      return "work"
    case "med_cert_uni":
      return "study"
    case "med_cert_carer":
      return "carer"
    default:
      return "work"
  }
}

/**
 * Get default text for a certificate type
 */
export function getDefaultCertificateText(type: CertificateTextType): CertificateTextConfig {
  return DEFAULT_CERTIFICATE_TEXT[type]
}

/**
 * Get certificate text with fallback to defaults
 * Used when loading templates that may not have custom text set
 */
export function getCertificateTextWithDefaults(
  type: CertificateTextType,
  customText?: Partial<CertificateTextConfig> | null
): CertificateTextConfig {
  const defaults = DEFAULT_CERTIFICATE_TEXT[type]
  
  if (!customText) {
    return defaults
  }
  
  return {
    title: customText.title || defaults.title,
    attestation: customText.attestation || defaults.attestation,
    notes: customText.notes ?? defaults.notes,
    restrictions: customText.restrictions ?? defaults.restrictions,
  }
}

/**
 * Get seal config with fallback to defaults
 */
export function getSealConfigWithDefaults(
  customSeal?: Partial<SealConfig> | null
): SealConfig {
  if (!customSeal) {
    return DEFAULT_SEAL_CONFIG
  }
  
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
  
  // Title is required
  if (!text.title || text.title.trim().length === 0) {
    errors.title = "Title is required"
  } else if (text.title.length > TEXT_LIMITS.title) {
    errors.title = `Title must be ${TEXT_LIMITS.title} characters or less`
  }
  
  // Attestation is required
  if (!text.attestation || text.attestation.trim().length === 0) {
    errors.attestation = "Attestation text is required"
  } else if (text.attestation.length > TEXT_LIMITS.attestation) {
    errors.attestation = `Attestation must be ${TEXT_LIMITS.attestation} characters or less`
  }
  
  // Notes is optional but has length limit
  if (text.notes && text.notes.length > TEXT_LIMITS.notes) {
    errors.notes = `Notes must be ${TEXT_LIMITS.notes} characters or less`
  }
  
  // Restrictions is optional but has length limit
  if (text.restrictions && text.restrictions.length > TEXT_LIMITS.restrictions) {
    errors.restrictions = `Restrictions must be ${TEXT_LIMITS.restrictions} characters or less`
  }
  
  return {
    valid: Object.keys(errors).length === 0,
    errors,
  }
}

/**
 * Convert newlines to paragraph breaks for rendering
 */
export function textToParagraphs(text: string): string[] {
  return text.split("\n").filter(p => p.trim().length > 0)
}
