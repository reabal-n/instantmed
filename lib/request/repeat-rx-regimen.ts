export interface RepeatRxMedicationDetails {
  name: string
  strength?: string
  form?: string
}

interface RepeatRxRegimenSignals {
  hasAmount: boolean
  hasFrequency: boolean
}

export const REPEAT_RX_REGIMEN_REQUIRED_MESSAGE =
  "Enter how you take it, including the amount and timing (for example, 1 tablet each morning)"

/**
 * Return only a patient-reported frequency that maps to a supported doctor
 * summary label. This is intentionally narrower than the regimen validator:
 * uncommon free-text directions remain visible to the doctor, but are not
 * normalised into a clipboard value that could change the patient's meaning.
 */
export function extractRepeatRxFrequency(
  value: string | null | undefined,
): string | null {
  const normalized = typeof value === "string"
    ? value.normalize("NFKC").trim().replace(/\s+/g, " ")
    : ""
  if (!normalized) return null

  return (
    /\b(?:three|3)\s+times?\s+(?:(?:a|per|each)\s+)?(?:day|daily)\b/i.test(normalized)
      ? "3 times daily"
      : /\b(?:twice|two\s+times?)\s+(?:(?:a|per|each)\s+)?(?:day|daily)\b/i.test(normalized)
        ? "Twice daily"
        : /\bonce\s+(?:(?:a|per|each)\s+)?(?:day|daily)\b/i.test(normalized)
          || /\bdaily\b/i.test(normalized)
          ? "Once daily"
          : /\b(?:each|every|in\s+the)\s+morning\b|\bmorning\b/i.test(normalized)
            ? "Morning"
            : /\b(?:at|each|every)\s+night\b|\b(?:nightly|bedtime)\b/i.test(normalized)
              ? "Night"
              : /\b(?:as|when|if)\s+(?:needed|required)\b|\bprn\b/i.test(normalized)
                ? "As needed"
                : null
  )
}

const QUANTITY_TOKEN = String.raw`(?:\d+(?:\.\d+)?|\d+\s*\/\s*\d+|one|two|three|four|five|six|seven|eight|nine|ten|half(?:\s+(?:a|of\s+a))?|quarter(?:\s+(?:a|of\s+a))?)`
const DOSE_UNIT_TOKEN = String.raw`(?:mg|mcg|micrograms?|µg|μg|g|grams?|ml|millilit(?:re|er)s?|units?|iu|tablets?|tabs?|pills?|capsules?|caps?|puffs?|pumps?|inhalations?|actuations?|sprays?|drops?|patch(?:es)?|sachets?|packets?|vials?|ampoules?|ampules?|nebules?|lozenges?|applications?|applicatorfuls?|suppositor(?:y|ies)|pessar(?:y|ies)|injections?|teaspoons?|tablespoons?)`

const AMOUNT_PATTERNS = [
  new RegExp(String.raw`\b${QUANTITY_TOKEN}\s*${DOSE_UNIT_TOKEN}\b`, "i"),
  new RegExp(String.raw`\b(?:a|an)\s+${DOSE_UNIT_TOKEN}\b`, "i"),
  new RegExp(
    String.raw`\b(?:take|use|apply|insert|inhale|instil|instill|inject|swallow|chew|dissolve)\s+${QUANTITY_TOKEN}\b(?![-\s]*(?:times?|x|hours?|hourly)\b)`,
    "i",
  ),
  /\b(?:a|one)\s+(?:thin\s+)?layer\b/i,
  /\b(?:thin|thinly|sparingly|pea[-\s]?sized|small)\s+(?:layer|amount)\b/i,
  /\bapply\s+(?:thinly|sparingly)\b/i,
] as const

const FREQUENCY_PATTERNS = [
  /\b(?:once|twice|three|four)\s+(?:(?:a|per|each)\s+)?(?:day|daily|week|weekly|fortnight|fortnightly|month|monthly)\b/i,
  /\b(?:\d+|one|two|three|four|five|six)\s+times?\s+(?:(?:a|per|each)\s+)?(?:day|daily|week|weekly|fortnight|fortnightly|month|monthly)\b/i,
  /\b(?:daily|nightly|weekly|fortnightly|monthly|hourly)\b/i,
  /\b(?:each|every)\s+(?:morning|afternoon|evening|night|day|week|month)\b/i,
  /\b(?:in\s+the|at)\s+(?:morning|afternoon|evening|night|bedtime)\b/i,
  /\b(?:morning|bedtime|nocte|mane)\b/i,
  /\b(?:as|when|if)\s+(?:needed|required)\b/i,
  /\bprn\b/i,
  new RegExp(
    String.raw`\bevery\s+(?:${QUANTITY_TOKEN}|second|third|other)\s*(?:hours?|days?|weeks?)\b`,
    "i",
  ),
  /\balternate\s+days?\b/i,
  /\b(?:on\s+)?(?:mondays?|tuesdays?|wednesdays?|thursdays?|fridays?|saturdays?|sundays?)\b/i,
  /\b(?:before|after|with)\s+(?:breakfast|lunch|dinner)\b/i,
  /\b(?:before|after|with)\s+meals?\b/i,
  /\b(?:od|bd|tds|qid)\b/i,
  /\bq\d+h\b/i,
] as const

// Patients commonly write a concise but still useful regimen such as
// "1 daily" or "half at night". The medicine and strength are collected
// separately, so requiring them to also name the tablet/capsule unit here is
// unnecessary friction. Exclude "2 times daily", which states frequency only.
const BARE_AMOUNT_WITH_FREQUENCY = new RegExp(
  String.raw`^(?:(?:take|use|apply|insert|inhale|instil|instill|inject|swallow|chew|dissolve)\s+)?${QUANTITY_TOKEN}\b(?![-\s]*(?:times?|x|hours?|hourly)\b)`,
  "i",
)

/**
 * Detect only whether patient-entered directions contain the two minimum
 * regimen signals needed for review. This does not parse, normalize, or infer
 * a dose; the clinician still confirms the exact directions independently.
 */
function getRepeatRxRegimenSignals(
  value: string | null | undefined,
): RepeatRxRegimenSignals {
  const normalized = typeof value === "string"
    ? value.normalize("NFKC").trim().replace(/\s+/g, " ")
    : ""

  if (!normalized) {
    return { hasAmount: false, hasFrequency: false }
  }

  const hasFrequency = FREQUENCY_PATTERNS.some((pattern) => pattern.test(normalized))
  const hasAmount = AMOUNT_PATTERNS.some((pattern) => pattern.test(normalized))
    || (hasFrequency && BARE_AMOUNT_WITH_FREQUENCY.test(normalized))

  return { hasAmount, hasFrequency }
}

export function hasCompleteRepeatRxRegimen(
  value: string | null | undefined,
): boolean {
  const { hasAmount, hasFrequency } = getRepeatRxRegimenSignals(value)
  return hasAmount && hasFrequency
}

export function areRepeatRxMedicationDetailsEqual(
  left: RepeatRxMedicationDetails,
  right: RepeatRxMedicationDetails,
): boolean {
  return (
    left.name === right.name
    && (left.strength || "") === (right.strength || "")
    && (left.form || "") === (right.form || "")
  )
}
