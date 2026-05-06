"use client"

import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"

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
    <div className="flex min-h-12 items-center justify-between gap-3 rounded-xl border border-border/60 bg-white p-3 shadow-sm shadow-primary/[0.03] dark:bg-card dark:shadow-none">
      <Label htmlFor={id} className="flex-1 cursor-pointer text-sm leading-snug">
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
          className="flex min-h-12 items-center justify-between gap-3 rounded-xl border border-border/60 bg-white p-3 shadow-sm shadow-primary/[0.03] dark:bg-card dark:shadow-none"
        >
          <Label htmlFor={item.key} className="flex-1 cursor-pointer text-sm leading-snug">
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
