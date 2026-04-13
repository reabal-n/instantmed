"use client"

import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

interface SmartSymptomInputProps {
  value: string
  onChange: (value: string) => void
  label: string
  placeholder?: string
  context?: string
  minLength?: number
  maxLength?: number
  required?: boolean
  helperText?: string
  className?: string
}

export function SmartSymptomInput({
  value,
  onChange,
  label,
  placeholder,
  minLength = 10,
  maxLength = 500,
  required = false,
  helperText,
  className,
}: SmartSymptomInputProps) {
  const isValid = isSymptomInputValid(value, minLength)
  const isTooLong = value.length > maxLength
  const showError = required && value.length > 0 && !isValid

  return (
    <div className={cn("space-y-1.5", className)}>
      <Label className="text-sm font-medium">
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </Label>
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        className={cn(
          "min-h-28 resize-none",
          showError && "border-destructive focus-visible:ring-destructive",
          isTooLong && "border-destructive focus-visible:ring-destructive"
        )}
      />
      <div className="flex items-start justify-between gap-2">
        {helperText && (
          <p className={cn("text-xs text-muted-foreground", showError && "text-destructive")}>
            {helperText}
          </p>
        )}
        <p className={cn("text-xs text-muted-foreground ml-auto shrink-0", isTooLong && "text-destructive")}>
          {value.length}/{maxLength}
        </p>
      </div>
    </div>
  )
}

export function isSymptomInputValid(value: string, minLength = 10): boolean {
  return value.trim().length >= minLength
}
