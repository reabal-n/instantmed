/**
 * ED doctor-only Parchment handoff presets derived from the patient's stated
 * `treatment_preference` on the ED consult intake.
 *
 * Doses follow standard adult starting prescriptions:
 *   - Tadalafil 5mg: lowest effective daily dose (10mg reserved for poor
 *     responders).
 *   - Sildenafil 50mg: standard adult starting dose. Escalate to 100mg only
 *     after a 50mg trial.
 *   - Quantities map to conservative starting prescriptions that follow PBS
 *     pack sizes (30 tabs daily ≈ 1 month; 8 tabs PRN ≈ ~weekly use over 2
 *     months).
 *
 * Hard contraindications (nitrate use, recent cardiac event, severe heart
 * condition) are gated upstream in `edSummary`; this preset table is only
 * read when the safety screen is already clear. The doctor still confirms the
 * final medicine, dose, quantity, repeats and directions in Parchment.
 */
export interface EdPreset {
  medicationName: string
  strength: string
  form: string
  quantityTemplate: string
  repeatsTemplate: string
  directionsTemplate: string
  medicationSearchHint: string
  alternativeNote?: string
}

export const ED_PRESCRIBING_PRESETS: Record<"daily" | "prn" | "doctor_decides", EdPreset> = {
  daily: {
    medicationName: "Tadalafil",
    strength: "5mg",
    form: "tablet",
    quantityTemplate: "30 tablets",
    repeatsTemplate: "2",
    directionsTemplate: "Take 1 tablet once daily, at the same time each day.",
    medicationSearchHint: "Tadalafil 5mg tablet",
  },
  prn: {
    medicationName: "Sildenafil",
    strength: "50mg",
    form: "tablet",
    quantityTemplate: "8 tablets",
    repeatsTemplate: "2",
    directionsTemplate: "Take 1 tablet 1 hour before sexual activity. Maximum 1 tablet per 24 hours.",
    medicationSearchHint: "Sildenafil 50mg tablet",
    alternativeNote: "Escalate to Sildenafil 100mg only after an adequate 50mg trial. Tadalafil 20mg PRN is an alternative when the patient wants a longer window of effect. Check the patient's stated prior treatment before defaulting to the starting dose.",
  },
  // Legacy only since 2026-07-19: the "let the doctor decide" card was removed
  // from the intake. Kept as the fallback preset for historical intakes and for
  // any answer we do not recognise.
  doctor_decides: {
    medicationName: "Sildenafil",
    strength: "50mg",
    form: "tablet",
    quantityTemplate: "8 tablets",
    repeatsTemplate: "2",
    directionsTemplate: "Take 1 tablet 1 hour before sexual activity. Maximum 1 tablet per 24 hours.",
    medicationSearchHint: "Sildenafil 50mg tablet",
    alternativeNote: "Patient hasn't expressed a preference. Tadalafil 5mg daily is an alternative for patients who prefer daily dosing.",
  },
}

export function getEdPreset(preference: string | null | undefined): EdPreset {
  if (preference === "daily" || preference === "prn") {
    return ED_PRESCRIBING_PRESETS[preference]
  }
  return ED_PRESCRIBING_PRESETS.doctor_decides
}
