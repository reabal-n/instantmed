/**
 * Doctor-portal decision support: rationale strings for safety-critical intake answers.
 * Keyed by the camelCase answer field name on the intake payload.
 *
 * Severity:
 *   - "destructive": hard clinical contraindication (absolute)
 *   - "warning":     relative contraindication or requires caution
 *
 * When these rationales render via Tooltip, they help the reviewing doctor
 * justify decline/caution decisions without needing to look up references.
 */

export type RationaleSeverity = "destructive" | "warning"

export interface Rationale {
  severity: RationaleSeverity
  text: string
}

type ValueMatcher = (value: unknown) => boolean

interface RationaleRule {
  severity: RationaleSeverity
  /** When this matcher returns true, the rationale applies */
  matches: ValueMatcher
  text: string
}

const TRUTHY: ValueMatcher = (v) => v === true || v === "true" || v === "yes"

const RATIONALES: Record<string, RationaleRule> = {
  // ED -- absolute contraindications
  nitrates: {
    severity: "destructive",
    matches: TRUTHY,
    text:
      "This class of oral treatment is absolutely contraindicated with nitrates - combined use can cause life-threatening hypotension. Do not prescribe.",
  },
  recentHeartEvent: {
    severity: "destructive",
    matches: TRUTHY,
    text:
      "A cardiovascular event in the past 6 months is a hard contraindication. Cardiovascular status must be stabilised before any vasoactive treatment can be considered.",
  },
  severeHeartCondition: {
    severity: "destructive",
    matches: TRUTHY,
    text:
      "Severe or unstable cardiovascular disease precludes treatment. Decline and refer for cardiology review.",
  },

  // ED -- relative contraindications
  edHypertension: {
    severity: "warning",
    matches: TRUTHY,
    text:
      "Uncontrolled hypertension (>170/100) is a relative contraindication. Confirm recent BP reading and consider decline until controlled.",
  },
  edDiabetes: {
    severity: "warning",
    matches: TRUTHY,
    text:
      "Uncontrolled diabetes warrants caution - poor glycaemic control is both a cause of ED and a risk factor. Consider requesting recent HbA1c.",
  },
  previousEdMeds: {
    severity: "warning",
    matches: (v) =>
      typeof v === "string" &&
      /serious (side )?effect|hospitalisation|emergency|reaction/i.test(v),
    text:
      "Patient reports a prior serious reaction to ED medication. Review the specific history before prescribing - consider a different molecule or decline.",
  },

  // Hair loss - reproductive safety (finasteride Category X)
  hairReproductive: {
    severity: "destructive",
    matches: (v: unknown) => v === "yes",
    text:
      "Finasteride is Category X (TGA/FDA). Oral 5-alpha reductase inhibitors carry teratogenic risk. Only topical minoxidil (OTC) should be considered when reproductive exposure is possible. Service declined at intake.",
  },

  // Women's health - UTI red flags
  utiRedFlags: {
    severity: "destructive",
    matches: TRUTHY,
    text:
      "Patient reports systemic symptoms (fever, back pain, nausea/vomiting). May indicate pyelonephritis or complicated UTI requiring in-person assessment and urine culture. Do not prescribe empirical antibiotics.",
  },

  // Women's health - UTI in pregnancy
  utiPregnant: {
    severity: "destructive",
    matches: (v: unknown) => v === "yes" || v === "not_sure",
    text:
      "UTI during pregnancy or possible pregnancy requires in-person assessment, urine culture, and culture-directed therapy. Many first-line antibiotics are contraindicated. Decline and refer to GP.",
  },

  // Women's health - MAP window exceeded
  hoursSinceIntercourse: {
    severity: "destructive",
    matches: (v: unknown) => v === "over_120",
    text:
      "Oral emergency contraception is not effective beyond 120 hours (5 days) post-intercourse. A copper IUD may still be effective up to 5 days. Refer to GP or family planning clinic.",
  },

  // Weight loss - eating disorder history
  eatingDisorderHistory: {
    severity: "warning",
    matches: TRUTHY,
    text:
      "Patient reports eating disorder history. Weight loss medication may exacerbate disordered eating patterns. Requires doctor phone consultation before prescribing.",
  },
}

export function getContraindicationRationale(
  fieldName: string,
  value: unknown,
): Rationale | null {
  const rule = RATIONALES[fieldName]
  if (!rule) return null
  if (!rule.matches(value)) return null
  return { severity: rule.severity, text: rule.text }
}

export function getRationaleSeverity(
  fieldName: string,
  value: unknown,
): RationaleSeverity | null {
  return getContraindicationRationale(fieldName, value)?.severity ?? null
}
