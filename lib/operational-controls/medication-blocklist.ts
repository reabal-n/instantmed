import {
  buildRepeatScriptMedicationValidationText,
  extractRepeatScriptMedications,
} from "@/lib/validation/repeat-script-medications"

function collectStringAnswers(
  answers: Record<string, unknown>,
  keys: string[],
): string[] {
  return keys
    .map((key) => answers[key])
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    .map((value) => value.trim())
}

export function getMedicationBlocklistCandidate(
  answers: Record<string, unknown>,
): string | undefined {
  const candidates = [
    ...collectStringAnswers(answers, [
      "medication_name",
      "medication_display",
      "medicationName",
      "medicationDisplay",
      "consult_details",
      "consultDetails",
    ]),
    ...extractRepeatScriptMedications(answers).map(buildRepeatScriptMedicationValidationText),
  ]

  const uniqueCandidates = Array.from(new Set(candidates.filter(Boolean)))
  return uniqueCandidates.length > 0 ? uniqueCandidates.join(" ") : undefined
}
