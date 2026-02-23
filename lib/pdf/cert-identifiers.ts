/**
 * Certificate identifier generators
 *
 * Pure utility functions for generating certificate numbers, verification codes,
 * and reference IDs. No rendering dependencies — safe to import anywhere.
 *
 * Extracted from med-cert-render.ts to decouple ID generation from the React-PDF
 * rendering pipeline.
 */

import crypto from "crypto"

// ============================================================================
// VERIFICATION CODE
// ============================================================================

/**
 * Generate a cryptographically random verification code
 * Format: 8-character alphanumeric code (A-Z, 0-9, excluding ambiguous chars)
 *
 * Note: This is independent of certificate number for security.
 * The _certificateNumber parameter is kept for backward compatibility but not used.
 */
export function generateVerificationCode(_certificateNumber?: string): string {
  // Alphanumeric charset excluding ambiguous characters (0/O, 1/I/L)
  const charset = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"
  const bytes = crypto.randomBytes(8)

  let code = ""
  for (let i = 0; i < 8; i++) {
    code += charset[bytes[i]! % charset.length]
  }

  return code
}

// ============================================================================
// CERTIFICATE NUMBER
// ============================================================================

/**
 * Generate a unique certificate number
 * Format: MC-YYYY-XXXXXXXX (year + random hex)
 */
export function generateCertificateNumber(): string {
  const year = new Date().getFullYear()
  const random = crypto.randomBytes(4).toString("hex").toUpperCase()
  return `MC-${year}-${random}`
}

// ============================================================================
// CERTIFICATE REF (template-based format)
// ============================================================================

/**
 * Generate a certificate reference ID for template-based PDFs.
 * Format: IM-[TYPE]-[YYYYMMDD]-[5DIGITRANDOM]
 * Example: IM-WORK-20260218-04827
 */
export function generateCertificateRef(type: "work" | "study" | "carer"): string {
  const typeCode = type.toUpperCase()
  const date = new Date().toISOString().split("T")[0]!.replace(/-/g, "")
  const random = String(crypto.randomInt(100000)).padStart(5, "0")
  return `IM-${typeCode}-${date}-${random}`
}
