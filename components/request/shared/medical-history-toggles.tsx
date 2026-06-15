"use client"

import { ToggleList } from "@/components/request/shared/intake-step-primitives"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ToggleItem {
  key: string
  label: string
  helpText?: string
}

interface MedicalHistoryTogglesProps {
  /** Config array of toggle items to render */
  items: readonly ToggleItem[]
  /** Current values keyed by item key */
  values: Record<string, unknown>
  /** Called when a toggle changes */
  onChange: (key: string, checked: boolean) => void
}

interface SwitchFieldProps {
  id: string
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
  helpText?: string
}

// ---------------------------------------------------------------------------
// SwitchField -- single toggle row with optional help text
// ---------------------------------------------------------------------------

export function SwitchField({
  id,
  label,
  checked,
  onChange,
  helpText,
}: SwitchFieldProps) {
  return (
    <ToggleList
      items={[{ key: id, label, helpText }]}
      values={{ [id]: checked }}
      onChange={(_, nextChecked) => onChange(nextChecked)}
    />
  )
}

// ---------------------------------------------------------------------------
// MedicalHistoryToggles -- renders a list of toggle rows from a config array
// ---------------------------------------------------------------------------

export function MedicalHistoryToggles({
  items,
  values,
  onChange,
}: MedicalHistoryTogglesProps) {
  return (
    <ToggleList items={items} values={values} onChange={onChange} />
  )
}
