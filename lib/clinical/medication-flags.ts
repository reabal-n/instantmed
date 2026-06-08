/**
 * Lightweight, NON-BLOCKING review flags for repeat-prescription intakes.
 *
 * These surface as amber "caution" items on the doctor review surface — they
 * never auto-decline and never gate the approve flow. The doctor always makes
 * the call. They exist to catch two failure modes that are easy to miss in a
 * dense "Patient answers" card:
 *
 *   1. The patient could not identify their own medicine (name / strength /
 *      form answered "unsure"). Prescribing off an unverified product is a
 *      safety risk — confirm the exact item in Parchment first.
 *   2. The requested medicine must be administered by a clinician (injection,
 *      vaccine, infusion, implant). A telehealth eScript alone does not
 *      complete the patient's care — they still need a clinic to administer it.
 *      (This is the Verorab/rabies-vaccine class of request.)
 */

const UNCERTAIN_ANSWER_PATTERN =
  /\b(unsure|not\s+sure|don'?t\s+know|dont\s+know|no\s+idea|can'?t\s+remember|cant\s+remember|not\s+certain|unknown)\b/i

/**
 * True if any of the supplied medication answer fields reads as "I'm not sure".
 * Pass the displayed medication fields (name, strength, form, compact labels).
 */
export function hasUncertainMedicationAnswer(
  values: ReadonlyArray<string | null | undefined>,
): boolean {
  return values.some((value) => !!value && UNCERTAIN_ANSWER_PATTERN.test(value))
}

/**
 * Medicines that a clinician must administer in person. Word-boundary anchored
 * to avoid false positives (e.g. "implantation" history text still matches
 * "implant" intentionally; we err toward surfacing a caution, never a block).
 */
const CLINICAL_ADMINISTRATION_PATTERN =
  /\b(injection|injectable|inject|vaccine|vaccination|vaccin|immunis\w*|immuniz\w*|intramuscular|subcutaneous|subcut|ampoule|ampule|\bvial\b|depot|infusion|implant)\b/i

/**
 * True if the supplied free text describes a clinician-administered medicine
 * (injection, vaccine, infusion, implant). Run against the combined medicine
 * name / strength / form / patient-reported dose text.
 */
export function requiresClinicalAdministration(text: string | null | undefined): boolean {
  if (!text) return false
  return CLINICAL_ADMINISTRATION_PATTERN.test(text)
}
