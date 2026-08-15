import { getSydneyDateOnly } from "@/lib/medical-certificates/date-policy"

export const CERTIFICATE_ISSUED_ON_SNAPSHOT_KEY = "certificate_issued_on_sydney"
export const CERTIFICATE_ISSUED_AT_SNAPSHOT_KEY = "certificate_issued_at_utc"

type IssuedDateEvidence = {
  createdAt: string
  issueDate: string
  templateConfigSnapshot: unknown
}

export function buildCertificateIssuedDateSnapshot(
  issuedAt: Date,
  issuedOn: string,
): Record<string, string> {
  if (Number.isNaN(issuedAt.getTime()) || getSydneyDateOnly(issuedAt) !== issuedOn) {
    throw new Error("Certificate issue timestamp does not match its Sydney issue date")
  }

  return {
    [CERTIFICATE_ISSUED_AT_SNAPSHOT_KEY]: issuedAt.toISOString(),
    [CERTIFICATE_ISSUED_ON_SNAPSHOT_KEY]: issuedOn,
  }
}

/**
 * New certificates carry the exact timestamp used to derive their Sydney
 * civil issue date. Legacy rows predate that snapshot, so their immutable
 * creation time is the only available fail-closed integrity signal.
 */
export function hasConsistentCertificateIssuedDate(
  evidence: IssuedDateEvidence,
): boolean {
  const snapshot = isRecord(evidence.templateConfigSnapshot)
    ? evidence.templateConfigSnapshot
    : null
  const snapshotIssuedOn = snapshot?.[CERTIFICATE_ISSUED_ON_SNAPSHOT_KEY]
  const snapshotIssuedAt = snapshot?.[CERTIFICATE_ISSUED_AT_SNAPSHOT_KEY]

  if (snapshotIssuedOn !== undefined || snapshotIssuedAt !== undefined) {
    if (typeof snapshotIssuedOn !== "string" || typeof snapshotIssuedAt !== "string") {
      return false
    }
    const issuedAt = new Date(snapshotIssuedAt)
    return !Number.isNaN(issuedAt.getTime()) &&
      snapshotIssuedOn === evidence.issueDate &&
      getSydneyDateOnly(issuedAt) === snapshotIssuedOn
  }

  const createdAt = new Date(evidence.createdAt)
  return !Number.isNaN(createdAt.getTime()) &&
    getSydneyDateOnly(createdAt) === evidence.issueDate
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}
