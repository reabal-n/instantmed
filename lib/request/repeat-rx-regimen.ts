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

export const REPEAT_RX_DOSE_AMOUNT_OPTIONS = [
  { value: "one", label: "1" },
  { value: "two", label: "2" },
] as const

export const REPEAT_RX_DOSE_UNIT_OPTIONS = [
  { value: "tablet", label: "Tablet", plural: "tablets" },
  { value: "capsule", label: "Capsule", plural: "capsules" },
  { value: "puff", label: "Puff", plural: "puffs" },
  { value: "mL", label: "mL", plural: "mL" },
  { value: "unit", label: "Unit", plural: "units" },
  { value: "application", label: "Application", plural: "applications" },
  { value: "patch", label: "Patch", plural: "patches" },
  { value: "drop", label: "Drop", plural: "drops" },
  { value: "spray", label: "Spray", plural: "sprays" },
] as const

export const REPEAT_RX_FREQUENCY_OPTIONS = [
  { value: "once_daily", label: "Once daily", phrase: "once daily" },
  { value: "twice_daily", label: "Twice daily", phrase: "twice daily" },
  { value: "three_times_daily", label: "3 times daily", phrase: "three times daily" },
  { value: "morning", label: "Morning", phrase: "each morning" },
  { value: "night", label: "Night", phrase: "at night" },
  { value: "as_needed", label: "As needed", phrase: "as needed" },
] as const

export type RepeatRxDoseAmount = (typeof REPEAT_RX_DOSE_AMOUNT_OPTIONS)[number]["value"]
export type RepeatRxDoseUnit = (typeof REPEAT_RX_DOSE_UNIT_OPTIONS)[number]["value"]
export type RepeatRxFrequency = (typeof REPEAT_RX_FREQUENCY_OPTIONS)[number]["value"]

export interface RepeatRxRegimenPreset {
  amount: RepeatRxDoseAmount
  unit: RepeatRxDoseUnit
  frequency: RepeatRxFrequency
}

const UNIT_ALIASES: Record<RepeatRxDoseUnit, RegExp> = {
  tablet: /^(?:tablet|tablets|tab|tabs)$/i,
  capsule: /^(?:capsule|capsules|cap|caps)$/i,
  puff: /^(?:puff|puffs|inhalation|inhalations)$/i,
  mL: /^(?:ml|millilitre|millilitres|milliliter|milliliters)$/i,
  unit: /^(?:unit|units|iu)$/i,
  application: /^(?:application|applications|applicatorful|applicatorfuls)$/i,
  patch: /^(?:patch|patches)$/i,
  drop: /^(?:drop|drops)$/i,
  spray: /^(?:spray|sprays)$/i,
}

const FREQUENCY_ALIASES: Record<RepeatRxFrequency, RegExp> = {
  once_daily: /^(?:once daily|daily|once a day)$/i,
  twice_daily: /^(?:twice daily|twice a day|two times daily)$/i,
  three_times_daily: /^(?:three times daily|3 times daily|three times a day)$/i,
  morning: /^(?:each morning|in the morning|morning)$/i,
  night: /^(?:at night|each night|nightly|bedtime)$/i,
  as_needed: /^(?:as needed|when needed|if needed|prn)$/i,
}

function doseUnitDefinition(unit: RepeatRxDoseUnit) {
  return REPEAT_RX_DOSE_UNIT_OPTIONS.find((option) => option.value === unit)
}

export function composeRepeatRxRegimen({
  amount,
  unit,
  frequency,
}: Partial<RepeatRxRegimenPreset>): string {
  const unitDefinition = unit ? doseUnitDefinition(unit) : undefined
  const frequencyDefinition = frequency
    ? REPEAT_RX_FREQUENCY_OPTIONS.find((option) => option.value === frequency)
    : undefined
  const quantity = amount === "one" ? "1" : amount === "two" ? "2" : ""
  const dose = quantity && unitDefinition
    ? `${quantity} ${amount === "one" ? unitDefinition.value : unitDefinition.plural}`
    : ""

  return [dose, frequencyDefinition?.phrase].filter(Boolean).join(" ")
}

export function parseRepeatRxRegimenPreset(
  value: string | null | undefined,
): RepeatRxRegimenPreset | null {
  const normalized = typeof value === "string"
    ? value.normalize("NFKC").trim().replace(/\s+/g, " ")
    : ""
  const match = /^(1|one|2|two)\s+([^\s]+)\s+(.+)$/i.exec(normalized)
  if (!match) return null

  const amount: RepeatRxDoseAmount = /^(?:1|one)$/i.test(match[1]) ? "one" : "two"
  const unit = (Object.entries(UNIT_ALIASES) as [RepeatRxDoseUnit, RegExp][])
    .find(([, pattern]) => pattern.test(match[2]))?.[0]
  const frequency = (Object.entries(FREQUENCY_ALIASES) as [RepeatRxFrequency, RegExp][])
    .find(([, pattern]) => pattern.test(match[3]))?.[0]

  return unit && frequency ? { amount, unit, frequency } : null
}

export function inferRepeatRxDoseUnit(
  medicationForm: string | null | undefined,
): RepeatRxDoseUnit | undefined {
  const normalized = medicationForm?.trim().toLowerCase()
  if (!normalized) return undefined
  if (/tab(?:let)?s?/.test(normalized)) return "tablet"
  if (/cap(?:sule)?s?/.test(normalized)) return "capsule"
  if (/inhaler|puff|inhalation/.test(normalized)) return "puff"
  if (/liquid|solution|syrup|suspension|\bml\b/.test(normalized)) return "mL"
  if (/cream|ointment|gel|lotion|foam/.test(normalized)) return "application"
  if (/patch/.test(normalized)) return "patch"
  if (/drop/.test(normalized)) return "drop"
  if (/spray/.test(normalized)) return "spray"
  if (/inject|insulin|\bunit/.test(normalized)) return "unit"
  return undefined
}

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
