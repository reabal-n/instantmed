export const MAX_REPEAT_SCRIPT_MEDICATIONS = 5

export interface RepeatScriptMedicationEntry {
  name: string
  displayName: string
  strength?: string
  form?: string
  pbsCode?: string
  brandName?: string
  activeIngredient?: string
  /** Free-text the patient gives when they can't identify the exact medicine. */
  description?: string
}

const TRIVIAL_UNKNOWN_DESCRIPTION = /^(unknown|i?\s*d(o|on'?)?\s*n?o?t?\s*know|dunno|idk|not sure|no idea|n\/?a|none|na)\b/i

/**
 * Floor for the "I don't know the exact name" path (A3 boundary 3): an unknown
 * medicine may only pass if the patient gives a genuinely useful free-text
 * description (what it's for, the name on the box, appearance, prescriber, usual
 * dose) — not just "unknown" / "don't know".
 */
export function isUsefulMedicationDescription(description: string | undefined | null): boolean {
  if (typeof description !== "string") return false
  const trimmed = description.trim()
  if (trimmed.length < 10) return false
  if (TRIVIAL_UNKNOWN_DESCRIPTION.test(trimmed)) return false
  return true
}

export interface RepeatScriptMedicationDisplayParts {
  name: string
  strength?: string
  form?: string
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null
}

function stringValue(source: Record<string, unknown> | null | undefined, keys: string[]): string | undefined {
  if (!source) return undefined
  for (const key of keys) {
    const value = source[key]
    if (typeof value === "string" && value.trim()) return value.trim()
    if (typeof value === "number" && Number.isFinite(value)) return String(value)
  }
  return undefined
}

function normalizeMedicationEntry(entry: Record<string, unknown>): RepeatScriptMedicationEntry | null {
  const product = asRecord(entry.product)
  const productName = stringValue(product, ["drug_name", "label", "name"])
  const entryName = stringValue(entry, ["name", "medicationName", "medication_name", "medicationDisplay", "medication_display"])
  const activeIngredient = stringValue(product, ["active_ingredient", "li_drug_name", "generic", "generic_name"])
    || stringValue(entry, ["activeIngredient", "active_ingredient"])
  const brandName = stringValue(product, ["brand_name"]) || stringValue(entry, ["brandName", "brand_name"])
  const name = productName || entryName || activeIngredient

  if (!name) return null

  return {
    name,
    displayName: [name, activeIngredient && activeIngredient.toLowerCase() !== name.toLowerCase() ? activeIngredient : null]
      .filter(Boolean)
      .join(" "),
    strength: stringValue(entry, ["strength", "medicationStrength", "medication_strength"]) || stringValue(product, ["strength"]),
    form: stringValue(entry, ["form", "medicationForm", "medication_form"]) || stringValue(product, ["form"]),
    pbsCode: stringValue(entry, ["pbsCode", "pbs_code", "amtCode", "amt_code"]) || stringValue(product, ["pbs_code", "amt_code"]),
    brandName,
    activeIngredient,
    description: stringValue(entry, ["description", "medicationDescription", "medication_description"]),
  }
}

function legacyMedicationEntry(answers: Record<string, unknown>): RepeatScriptMedicationEntry | null {
  const name = stringValue(answers, ["medicationName", "medication_name", "medicationDisplay", "medication_display", "medication"])
  const displayName = stringValue(answers, ["medicationDisplay", "medication_display", "medicationName", "medication_name", "medication"])

  if (!name && !displayName) return null

  return {
    name: name || displayName || "",
    displayName: displayName || name || "",
    strength: stringValue(answers, ["medicationStrength", "medication_strength", "strength"]),
    form: stringValue(answers, ["medicationForm", "medication_form", "form"]),
    pbsCode: stringValue(answers, ["pbsCode", "pbs_code", "amtCode", "amt_code"]),
  }
}

export function countRepeatScriptMedicationRows(answers: Record<string, unknown>): number {
  return Array.isArray(answers.medications) ? answers.medications.length : 0
}

export function extractRepeatScriptMedications(answers: Record<string, unknown>): RepeatScriptMedicationEntry[] {
  const entries = Array.isArray(answers.medications)
    ? answers.medications
        .map((entry) => asRecord(entry))
        .filter((entry): entry is Record<string, unknown> => Boolean(entry))
        .map(normalizeMedicationEntry)
        .filter((entry): entry is RepeatScriptMedicationEntry => Boolean(entry))
    : []

  const legacy = legacyMedicationEntry(answers)
  if (entries.length === 0 && legacy) entries.push(legacy)

  const seen = new Set<string>()
  return entries.filter((entry) => {
    const key = [
      entry.name,
      entry.strength || "",
      entry.form || "",
      entry.pbsCode || "",
    ].join("|").toLowerCase()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export function formatRepeatScriptMedicationLabel(entry: RepeatScriptMedicationEntry): string {
  const name = entry.activeIngredient && entry.activeIngredient.toLowerCase() !== entry.name.toLowerCase()
    ? `${entry.name} (${entry.activeIngredient})`
    : entry.name
  return [name, entry.strength, entry.form].filter(Boolean).join(" ")
}

function stripContainingClause(value: string | undefined): string | undefined {
  if (!value) return undefined
  return value
    .replace(/\s+containing\s+.+$/i, "")
    .replace(/\s+/g, " ")
    .trim()
}

function extractStrength(value: string | undefined): string | undefined {
  if (!value) return undefined
  const match = value.match(/\b\d+(?:\.\d+)?\s*(?:micrograms?|mcg|milligrams?|mg|grams?|g|units?|iu|%)\b/i)
  return match?.[0]?.replace(/\s+/g, " ").trim()
}

function stripFormFromName(value: string): string {
  const knownFormPattern = /\b(tablet|capsule|caplet|solution|suspension|cream|ointment|gel|patch|inhaler|injection|drops?|spray|pessary|suppository|liquid)\b/i
  const match = value.match(knownFormPattern)
  return match?.index && match.index > 0
    ? value.slice(0, match.index).trim()
    : value.trim()
}

export function getRepeatScriptMedicationDisplayParts(
  entry: RepeatScriptMedicationEntry,
): RepeatScriptMedicationDisplayParts {
  const normalizedName = stripContainingClause(entry.activeIngredient || entry.name) || entry.name
  const name = stripFormFromName(normalizedName)
  const strength = extractStrength(entry.strength) || extractStrength(entry.displayName) || stripContainingClause(entry.strength)
  const form = stripContainingClause(entry.form)

  return {
    name,
    strength,
    form: form && form.toLowerCase() !== name.toLowerCase() ? form : undefined,
  }
}

export function formatRepeatScriptMedicationCompactLabel(entry: RepeatScriptMedicationEntry): string {
  const parts = getRepeatScriptMedicationDisplayParts(entry)
  return [parts.name, parts.strength, parts.form].filter(Boolean).join(" ")
}

export function buildRepeatScriptMedicationValidationText(entry: RepeatScriptMedicationEntry): string {
  return [
    entry.name,
    entry.displayName,
    entry.brandName,
    entry.activeIngredient,
    entry.strength,
    entry.form,
    // Include the free-text description so the controlled-substance / blocklist
    // scan also sees a medicine named only in the "I don't know" description.
    entry.description,
  ].filter(Boolean).join(" ")
}
