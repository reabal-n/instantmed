/**
 * Shared certificate verification logic.
 *
 * Used by both the JSON API (`/api/verify`) and the public reference page
 * (`/verify/[certificate_ref]`). Keeping the status logic and the doctor /
 * type formatters in one place prevents drift — TypeScript will refuse to
 * compile if a new CertificateStatus is added without a branch here.
 */

import type { CertificateStatus, IssuedCertificate } from "@/lib/data/issued-certificates"

export type VerifyOutcome =
  | {
      kind: "authentic"
      cert: IssuedCertificate
    }
  | {
      kind: "revoked"
      cert: IssuedCertificate
    }
  | {
      kind: "superseded"
      cert: IssuedCertificate
    }
  | {
      kind: "not_found"
    }

/**
 * Decide what the public verifier should see for a given cert row.
 * Med certs do not expire — only revocation breaks authenticity.
 * 'superseded' means a replacement exists; verifiers should request it.
 */
export function verifyOutcome(cert: IssuedCertificate | null): VerifyOutcome {
  if (!cert) return { kind: "not_found" }

  switch (cert.status as CertificateStatus) {
    case "valid":
      return { kind: "authentic", cert }
    case "revoked":
      return { kind: "revoked", cert }
    case "superseded":
      return { kind: "superseded", cert }
    case "expired":
      // Legacy status — treated as authentic. The cron that produced these
      // was deleted in commit 9c56ac612 and the DB rows backfilled. The
      // status enum value remains for historical reads only.
      return { kind: "authentic", cert }
    default: {
      // Exhaustiveness check. If a new status is added without a branch
      // here, the assignment will fail at compile time.
      const _exhaustive: never = cert.status as never
      void _exhaustive
      return { kind: "not_found" }
    }
  }
}

/**
 * Format doctor name as "Dr. {Name}, {Nominals}".
 * Idempotent — adding "Dr." to a name that already starts with "Dr." is skipped.
 */
export function formatDoctorName(name: string | null, nominals: string | null): string {
  if (!name) return "InstantMed Doctor"
  const trimmed = name.trim()
  const withTitle = /^dr\.?\s/i.test(trimmed) ? trimmed : `Dr. ${trimmed}`
  if (!nominals) return withTitle
  return `${withTitle}, ${nominals}`
}

export function formatCertificateType(type: string | null): string {
  switch (type) {
    case "work":
      return "Medical Certificate (Work)"
    case "study":
      return "Medical Certificate (Study)"
    case "carer":
      return "Carer's Leave Certificate"
    default:
      return "Medical Certificate"
  }
}

/**
 * Mask patient name for privacy on public verification responses.
 * "Jane Doe" -> "Jane D."  ·  "Jane" -> "Jane"  ·  null -> "Patient"
 */
export function maskPatientName(fullName: string | null): string {
  if (!fullName) return "Patient"
  const parts = fullName.trim().split(/\s+/)
  if (parts.length === 0) return "Patient"
  if (parts.length === 1) return parts[0]!
  const firstName = parts[0]
  const lastInitial = parts[parts.length - 1]![0]?.toUpperCase() || ""
  return lastInitial ? `${firstName} ${lastInitial}.` : firstName!
}
