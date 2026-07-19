export interface RepeatRxMedicationDetails {
  name: string
  strength?: string
  form?: string
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
