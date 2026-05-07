import { extractRepeatScriptMedications } from "@/lib/validation/repeat-script-medications"

export interface RepeatMedicationEntry {
  name: string
  strength?: string
  form?: string
  pbsCode?: string
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
  return [entry.name, entry.strength, entry.form].filter(Boolean).join(" ")
}
