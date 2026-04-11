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

  // Hair loss -- future use (most hair-loss safety gates land with the intake rewrite)
  // Placeholders left empty intentionally -- add as rename migrations land.
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
