export const MIN_CLINICAL_NOTES_LENGTH = 1

/**
 * Canonical field order for an AI clinical-note draft. Single source of truth so
 * the patient-facing note reads consistently wherever it is rendered or synced.
 */
export const CLINICAL_NOTE_FIELD_ORDER = [
  "presentingComplaint",
  "historyOfPresentIllness",
  "relevantInformation",
  "certificateDetails",
] as const

/**
 * Format clinical-note draft JSON into a brief bulleted note — one essential
 * bullet per populated field, no SOAP labels. The SINGLE source of truth for
 * this formatting; client review surfaces, the full-page action hook, and the
 * server-side doctor_notes sync all delegate here. (Duplicated copies of this
 * logic previously drifted apart — see PR #197.)
 */
export function formatClinicalNoteBullets(content: Record<string, unknown>): string {
  return CLINICAL_NOTE_FIELD_ORDER
    .map((key) => (typeof content[key] === "string" ? (content[key] as string).trim() : ""))
    .filter((piece) => piece.length > 0)
    .map((piece) => `• ${piece}`)
    .join("\n")
}

export function isClinicalNoteSufficient(notes: string | null | undefined): boolean {
  return (notes?.trim().length || 0) >= MIN_CLINICAL_NOTES_LENGTH
}

export function resolveClinicalDecisionNote({
  doctorNotes,
  fallbackDraftNote,
}: {
  doctorNotes: string | null | undefined
  fallbackDraftNote: string | null | undefined
}): string | null {
  const trimmedDoctorNotes = doctorNotes?.trim() || ""
  if (isClinicalNoteSufficient(trimmedDoctorNotes)) return trimmedDoctorNotes

  const trimmedFallback = fallbackDraftNote?.trim() || ""
  if (isClinicalNoteSufficient(trimmedFallback)) return trimmedFallback

  return null
}
