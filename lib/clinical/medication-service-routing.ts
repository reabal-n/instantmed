/**
 * Medication → dedicated-service routing.
 *
 * Some medicines have a dedicated InstantMed service with its own safety
 * screening (hair loss; women's health). When one is entered into the generic
 * repeat-prescription / prescription flow, we *steer* the patient to that
 * service rather than silently letting it through the generic path.
 *
 * This is intent-aware, NOT a hard block:
 *  - finasteride/dutasteride are also BPH (prostate) medicines — a 5 mg
 *    finasteride (Proscar) or dutasteride 0.5 mg (Avodart/Duodart) repeat is a
 *    legitimate repeat prescription, NOT hair loss, so those are excluded.
 *  - "continue my current pill" is deliberately a cheap repeat, not a consult
 *    (see lib/request/consult-subtypes.ts + womens-health-type-step.tsx).
 * The UI keeps an explicit "this is an existing repeat" escape, and a
 * doctor-visible flag (lib/clinical/derive-intake-flags.ts) is the server-side
 * backstop so the decision is never client-only.
 *
 * UTI antibiotics are intentionally out of scope: acute antibiotic courses are
 * not repeat scripts, so patients don't reach repeat-Rx with one.
 */

export type DedicatedServiceSubtype = "hair_loss" | "womens_health"

export interface DedicatedServiceMatch {
  /** Consult subtype to deep-link into (`/request?service=consult&subtype=…`). */
  subtype: DedicatedServiceSubtype
  /** Human label for CTAs / flag detail, e.g. "Hair Loss". */
  serviceLabel: string
  /** Why it matched — surfaced to the doctor as the flag detail. */
  reason: string
}

// Hair-loss signal: dedicated hair brands + the generic 5α-reductase / minoxidil
// names. Generic "finasteride"/"dutasteride" is ambiguous (hair vs BPH) and is
// disambiguated by BPH_MARKERS below.
const HAIR_LOSS_PATTERNS: ReadonlyArray<RegExp> = [
  /\bpropecia\b/i,
  /\bfinpecia\b/i,
  /\bfinasteride\b/i,
  /\bdutasteride\b/i,
  /\bminoxidil\b/i,
  /\brogaine\b/i,
  /\bregaine\b/i,
  /\bhair\s*(loss|regrow|growth)\b/i,
]

// Unambiguous BPH / prostate context — these are legitimate repeat scripts and
// must NOT be steered to hair loss.
const BPH_MARKERS: ReadonlyArray<RegExp> = [
  /\bproscar\b/i,
  /\bavodart\b/i,
  /\bduodart\b/i,
  /\bcombodart\b/i,
  /\bloniten\b/i, // oral minoxidil for hypertension (not hair)
  /\btamsulosin\b/i,
  /\bprostate\b/i,
  /\bbph\b/i,
  /benign\s+prostatic/i,
  // finasteride 5 mg (Proscar) — BPH dose. 1 mg is the hair dose.
  /finasteride[^0-9]{0,10}5\s*mg/i,
  // dutasteride 0.5 mg — BPH dose.
  /dutasteride[^0-9]{0,10}0\.?5\s*mg/i,
]

// Oral contraceptive pill: active ingredients + common Australian brands.
// Combined + progestogen-only. Not exhaustive — the doctor flag catches the
// long tail; this covers the medicines patients actually type.
const OCP_PATTERNS: ReadonlyArray<RegExp> = [
  // Active ingredients (combined + POP)
  /ethinyl[o]?estradiol/i,
  /\blevonorgestrel\b/i,
  /\bdrospirenone\b/i,
  /\bdesogestrel\b/i,
  /\bgestodene\b/i,
  /\bnorethisterone\b/i,
  /\bcyproterone\b/i, // Diane/Estelle/Brenda — also acne; UI escape covers that
  /\bdienogest\b/i,
  /\bnomegestrol\b/i,
  // Common AU combined-pill brands
  /\bmicrogynon\b/i,
  /\blevlen\b/i,
  /\bnordette\b/i,
  /\bmonofeme\b/i,
  /\btrifeme\b/i,
  /\btriquilar\b/i,
  /\blogynon\b/i,
  /\bfemme[\s-]?tab\b/i,
  /\blenest\b/i,
  /\bloette\b/i,
  /\byasmin\b/i,
  /\byaz\b/i,
  /\bpetibelle\b/i,
  /\bmarvelon\b/i,
  /\bmadeleine\b/i,
  /\bbrevinor\b/i,
  /\bnorimin\b/i,
  /\bnorinyl\b/i,
  /\bvalette\b/i,
  /\bqlaira\b/i,
  /\bzoely\b/i,
  /\bdiane[\s-]?35\b/i,
  /\bestelle[\s-]?35\b/i,
  /\bbrenda[\s-]?35\b/i,
  /\bjuliet[\s-]?35\b/i,
  /\blaila[\s-]?35\b/i,
  // Progestogen-only pills
  /\bslinda\b/i,
  /\bmicrolut\b/i,
  /\bnoriday\b/i,
  /\bcerazette\b/i,
]

/**
 * Classify a medication scan string (typically
 * `buildRepeatScriptMedicationValidationText(entry)`) into a dedicated service,
 * or null if it belongs in the generic repeat/prescription flow.
 */
export function detectDedicatedServiceForMedication(
  scanText: string | undefined | null,
): DedicatedServiceMatch | null {
  if (typeof scanText !== "string" || !scanText.trim()) return null
  const text = scanText.toLowerCase()

  // Women's health (OCP) first — pill brands are unambiguous and never overlap
  // with the hair-loss / BPH 5α-reductase inhibitors.
  if (OCP_PATTERNS.some((pattern) => pattern.test(text))) {
    return {
      subtype: "womens_health",
      serviceLabel: "Women's Health",
      reason: "Contraceptive pill — has a dedicated women's health pathway",
    }
  }

  const looksHairLoss = HAIR_LOSS_PATTERNS.some((pattern) => pattern.test(text))
  const looksBph = BPH_MARKERS.some((pattern) => pattern.test(text))
  if (looksHairLoss && !looksBph) {
    return {
      subtype: "hair_loss",
      serviceLabel: "Hair Loss",
      reason: "Hair-loss medicine — has a dedicated hair loss pathway",
    }
  }

  return null
}
