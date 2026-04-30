export const MIN_CLINICAL_NOTES_LENGTH = 50

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
