export const MAX_REPEAT_SCRIPT_MEDICATIONS = 5

export interface RepeatScriptMedicationEntry {
  name: string
  displayName: string
  strength?: string
  form?: string
  pbsCode?: string
  brandName?: string
  activeIngredient?: string
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
  if (legacy) entries.push(legacy)

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

export function buildRepeatScriptMedicationValidationText(entry: RepeatScriptMedicationEntry): string {
  return [
    entry.name,
    entry.displayName,
    entry.brandName,
    entry.activeIngredient,
    entry.strength,
    entry.form,
  ].filter(Boolean).join(" ")
}
