import {
  extractRepeatScriptMedications,
  formatRepeatScriptMedicationLabel,
} from "@/lib/validation/repeat-script-medications"

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
  return extractRepeatScriptMedications(answers).map((entry) => ({
    name: entry.name,
    strength: entry.strength,
    form: entry.form,
    pbsCode: entry.pbsCode,
  }))
}

export function formatRepeatMedication(entry: RepeatMedicationEntry): string {
  if ("displayName" in entry) {
    return formatRepeatScriptMedicationLabel(entry as Parameters<typeof formatRepeatScriptMedicationLabel>[0])
  }
  return [entry.name, entry.strength, entry.form].filter(Boolean).join(" ")
}
