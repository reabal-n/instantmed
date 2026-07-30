const PARCHMENT_INTAKE_CORRELATION_PATTERN = /^IM-\d{8}-[0-9A-F]{6}$/

const PARCHMENT_INTAKE_CORRELATION_MAX_LENGTH = 30

/**
 * Parchment echoes `reserved_1` into prescription webhook metadata. Use the
 * database-generated request reference as the correlation handle: it is
 * unique, opaque, contains no patient data, and is shorter than Parchment's
 * 30-character reserved-field limit.
 *
 * Reject anything outside the canonical database format so a manually edited
 * reference can never place names, email addresses, UUIDs, or other identifiers
 * into the external handoff.
 */
export function parseParchmentIntakeCorrelation(value: unknown): string | null {
  if (typeof value !== "string") return null

  const correlation = value.trim()
  if (
    correlation.length === 0 ||
    correlation.length > PARCHMENT_INTAKE_CORRELATION_MAX_LENGTH ||
    !PARCHMENT_INTAKE_CORRELATION_PATTERN.test(correlation)
  ) {
    return null
  }

  return correlation
}

export function buildParchmentIntakeRedirectPath(
  parchmentPatientId: string,
  referenceNumber: unknown,
): string | null {
  const correlation = parseParchmentIntakeCorrelation(referenceNumber)
  if (!correlation) return null

  const query = new URLSearchParams({ reserved_1: correlation })
  return `/embed/patients/${encodeURIComponent(parchmentPatientId)}/prescriptions?${query.toString()}`
}
