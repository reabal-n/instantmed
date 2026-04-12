"use client"

import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ToggleItem {
  key: string
  label: string
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
    <div className="flex items-center justify-between gap-3 p-3 rounded-xl border bg-muted/30">
      <Label htmlFor={id} className="text-sm cursor-pointer leading-snug flex-1">
        {label}
        {helpText && (
          <span className="block text-xs text-muted-foreground mt-0.5">{helpText}</span>
        )}
      </Label>
      <Switch
        id={id}
        checked={checked}
        onCheckedChange={onChange}
      />
    </div>
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
    <div className="space-y-2">
      {items.map((item) => (
        <div
          key={item.key}
          className="flex items-center justify-between gap-3 p-3 rounded-xl border bg-muted/30"
        >
          <Label htmlFor={item.key} className="text-sm cursor-pointer leading-snug flex-1">
            {item.label}
          </Label>
          <Switch
            id={item.key}
            checked={values[item.key] === true}
            onCheckedChange={(checked) => onChange(item.key, checked)}
          />
        </div>
      ))}
    </div>
  )
}
