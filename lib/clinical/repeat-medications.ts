export interface RepeatMedicationEntry {
  name: string
  strength?: string
  form?: string
  pbsCode?: string
}

type RawMedicationEntry = {
  product?: unknown
  name?: unknown
  strength?: unknown
  form?: unknown
  pbsCode?: unknown
  pbs_code?: unknown
}

function trimString(value: unknown): string | undefined {
  if (typeof value === "string" && value.trim()) return value.trim()
  if (typeof value === "number" && Number.isFinite(value)) return String(value)
  return undefined
}

function productString(product: unknown, key: "drug_name" | "strength" | "form" | "pbs_code"): string | undefined {
  if (!product || typeof product !== "object") return undefined
  return trimString((product as Record<string, unknown>)[key])
}

function medicationFromRaw(raw: RawMedicationEntry): RepeatMedicationEntry | null {
  const name = productString(raw.product, "drug_name") || trimString(raw.name)
  if (!name) return null

  return {
    name,
    strength: trimString(raw.strength) || productString(raw.product, "strength"),
    form: trimString(raw.form) || productString(raw.product, "form"),
    pbsCode: trimString(raw.pbsCode) || trimString(raw.pbs_code) || productString(raw.product, "pbs_code"),
  }
}

export function collectRepeatMedicationEntries(answers: Record<string, unknown>): RepeatMedicationEntry[] {
  const entries: RepeatMedicationEntry[] = []

  if (Array.isArray(answers.medications)) {
    for (const rawEntry of answers.medications) {
      if (!rawEntry || typeof rawEntry !== "object") continue
      const entry = medicationFromRaw(rawEntry as RawMedicationEntry)
      if (entry) entries.push(entry)
    }
  }

  if (entries.length > 0) return entries

  const scalarName = trimString(answers.medicationName)
    || trimString(answers.medication_name)
    || trimString(answers.medicationDisplay)
    || trimString(answers.medication_display)
    || trimString(answers.medication)

  if (!scalarName) return []

  return [{
    name: scalarName,
    strength: trimString(answers.medicationStrength)
      || trimString(answers.medication_strength)
      || trimString(answers.strength),
    form: trimString(answers.medicationForm)
      || trimString(answers.medication_form)
      || trimString(answers.form),
    pbsCode: trimString(answers.pbsCode)
      || trimString(answers.pbs_code)
      || trimString(answers.amt_code),
  }]
}

export function formatRepeatMedication(entry: RepeatMedicationEntry): string {
  return [entry.name, entry.strength, entry.form].filter(Boolean).join(" ")
}
