/**
 * Certificate identifier generators
 *
 * Pure utility functions for generating certificate numbers, verification codes,
 * and reference IDs. No rendering dependencies - safe to import anywhere.
 *
 * Extracted from med-cert-render.ts to decouple ID generation from the React-PDF
 * rendering pipeline.
 */

import crypto from "crypto"

interface IssuedOnParts {
  year: string
  compact: string
}

function parseIssuedOn(issuedOn: string): IssuedOnParts {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(issuedOn)
  if (!match) {
    throw new Error("issuedOn must be a valid date in YYYY-MM-DD format")
  }

  const [, year, month, day] = match
  const parsed = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)))
  if (parsed.toISOString().slice(0, 10) !== issuedOn) {
    throw new Error("issuedOn must be a valid date in YYYY-MM-DD format")
  }

  return { year: year!, compact: `${year}${month}${day}` }
}

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
export function generateCertificateNumber(issuedOn: string): string {
  const { year } = parseIssuedOn(issuedOn)
  const random = crypto.randomBytes(4).toString("hex").toUpperCase()
  return `MC-${year}-${random}`
}

// ============================================================================
// CERTIFICATE REF (template-based format)
// ============================================================================

/**
 * Generate a certificate reference ID for template-based PDFs.
 * Format: IM-[TYPE]-[YYYYMMDD]-[NNNNNNNN]
 * Example: IM-WORK-20260218-04827391
 *
 * Uses 8-digit random (100M possibilities per type/day) to avoid
 * birthday-paradox collisions. DB UNIQUE constraint on certificate_ref
 * provides a hard safety net (see migration 20260218000001).
 */
export function generateCertificateRef(
  type: "work" | "study" | "carer",
  issuedOn: string,
): string {
  const typeCode = type.toUpperCase()
  const { compact } = parseIssuedOn(issuedOn)
  const random = String(crypto.randomInt(100_000_000)).padStart(8, "0")
  return `IM-${typeCode}-${compact}-${random}`
}
