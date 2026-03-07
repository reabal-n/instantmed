"use client"

/**
 * Form Input - Shared wrapper for form fields with labels and validation
 */

import { Label } from "@/components/ui/label"
import { FieldLabelWithHelp } from "@/components/ui/help-tooltip"

interface FormInputProps {
  label: string
  required?: boolean
  hint?: string
  error?: string
  helpText?: string
  children: React.ReactNode
}

export function FormInput({
  label,
  required,
  hint,
  error,
  helpText,
  children,
}: FormInputProps) {
  return (
    <div className="space-y-2">
      {helpText ? (
        <FieldLabelWithHelp label={label} helpText={helpText} required={required} />
      ) : (
        <Label className="text-sm font-medium">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </Label>
      )}
      {children}
      {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}
