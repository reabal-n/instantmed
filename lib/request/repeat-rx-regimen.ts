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
  "Enter how much you take and how often (for example, one tablet each morning)"

const QUANTITY_TOKEN = String.raw`(?:\d+(?:\.\d+)?|\d+\s*\/\s*\d+|one|two|three|four|five|six|seven|eight|nine|ten|half(?:\s+(?:a|of\s+a))?|quarter(?:\s+(?:a|of\s+a))?)`
const DOSE_UNIT_TOKEN = String.raw`(?:mg|mcg|micrograms?|µg|μg|g|grams?|ml|millilit(?:re|er)s?|units?|iu|tablets?|tabs?|pills?|capsules?|caps?|puffs?|pumps?|inhalations?|actuations?|sprays?|drops?|patch(?:es)?|sachets?|packets?|vials?|ampoules?|ampules?|nebules?|lozenges?|applications?|applicatorfuls?|suppositor(?:y|ies)|pessar(?:y|ies)|injections?|teaspoons?|tablespoons?)`

const AMOUNT_PATTERNS = [
  new RegExp(String.raw`\b${QUANTITY_TOKEN}\s*${DOSE_UNIT_TOKEN}\b`, "i"),
  new RegExp(String.raw`\b(?:a|an)\s+${DOSE_UNIT_TOKEN}\b`, "i"),
  new RegExp(
    String.raw`\b(?:take|use|apply|insert|inhale|instil|instill|inject|swallow|chew|dissolve)\s+${QUANTITY_TOKEN}\b`,
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

  return {
    hasAmount: AMOUNT_PATTERNS.some((pattern) => pattern.test(normalized)),
    hasFrequency: FREQUENCY_PATTERNS.some((pattern) => pattern.test(normalized)),
  }
}

export function hasCompleteRepeatRxRegimen(
  value: string | null | undefined,
): boolean {
  const { hasAmount, hasFrequency } = getRepeatRxRegimenSignals(value)
  return hasAmount && hasFrequency
}

function doseSegments(value: string): string[] {
  return value
    .split(",")
    .map((segment) => segment.trim())
    .filter(Boolean)
}

export function hasDoseFrequencyStarter(value: string, starter: string): boolean {
  const normalizedStarter = starter.trim().toLowerCase()
  if (!normalizedStarter) return false

  return doseSegments(value).some(
    (segment) => segment.toLowerCase() === normalizedStarter,
  )
}

export function toggleDoseFrequencyStarter(value: string, starter: string): string {
  const normalizedStarter = starter.trim()
  if (!normalizedStarter) return value

  if (!hasDoseFrequencyStarter(value, normalizedStarter)) {
    return value.trim()
      ? `${value.trim()}, ${normalizedStarter}`
      : normalizedStarter
  }

  return doseSegments(value)
    .filter((segment) => segment.toLowerCase() !== normalizedStarter.toLowerCase())
    .join(", ")
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
