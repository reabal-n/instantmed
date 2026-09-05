/** Audit metadata is redacted before storage. Prefer the canonical safe ID. */
export function getParchmentAuditPatientId(metadata: Record<string, unknown> | null): string | null {
  for (const key of ["patient_id", "patient_profile_id", "partner_patient_id"]) {
    const value = metadata?.[key]
    if (typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) {
      return value
    }
  }
  return null
}
