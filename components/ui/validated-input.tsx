"use client"

import { useState, useEffect } from "react"
import { Input, InputProps } from "@heroui/react"
import { Check, AlertCircle, Info } from "lucide-react"
import { cn } from "@/lib/utils"

interface ValidationRule {
  validate: (value: string) => boolean
  message: string
}

interface ValidatedInputProps extends Omit<InputProps, "onChange"> {
  value: string
  onChange: (value: string) => void
  validationRules?: ValidationRule[]
  validateOnChange?: boolean
  showSuccessIndicator?: boolean
  helperText?: string
  formatHint?: string // e.g., "04XX XXX XXX" for phone
  maxLength?: number // For character counter
  showCharacterCounter?: boolean // Show character count
  showFormatHintOnFocus?: boolean // Show format hint when focused
  label: string
  type?: "text" | "email" | "tel" | "password" | "number"
}

export function ValidatedInput({
  value,
  onChange,
  validationRules = [],
  validateOnChange = true,
  showSuccessIndicator = true,
  helperText,
  formatHint,
  maxLength,
  showCharacterCounter = false,
  showFormatHintOnFocus = true,
  label,
  type = "text",
  className,
  ...props
}: ValidatedInputProps) {
  const [touched, setTouched] = useState(false)
  const [focused, setFocused] = useState(false)

  // Compute validation state directly instead of storing in state
  const validationState = (() => {
    if (!validateOnChange || !touched) {
      return { error: null, isValid: false }
    }

    // Validate
    for (const rule of validationRules) {
      if (!rule.validate(value)) {
        return { error: rule.message, isValid: false }
      }
    }

    return { error: null, isValid: value.length > 0 }
  })()

  const { error, isValid } = validationState

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    // Respect maxLength if provided
    if (maxLength && newValue.length > maxLength) {
      return
    }
    onChange(newValue)
    if (!touched) setTouched(true)
  }

  const handleBlur = () => {
    if (!touched) setTouched(true)
    setFocused(false)
  }

  const handleFocus = () => {
    setFocused(true)
  }

  // Format phone number display (Australian format)
  const formatPhoneDisplay = (val: string) => {
    if (type !== "tel" || !formatHint) return val
    const digits = val.replace(/\D/g, "")
    if (digits.length <= 2) return digits
    if (digits.length <= 6) return `${digits.slice(0, 2)} ${digits.slice(2)}`
    return `${digits.slice(0, 2)} ${digits.slice(2, 6)} ${digits.slice(6, 10)}`
  }

  const displayValue = type === "tel" && formatHint ? formatPhoneDisplay(value) : value
  const characterCount = value.length
  const remainingChars = maxLength ? maxLength - characterCount : null

  return (
    <div className="space-y-1">
      <Input
        {...props}
        type={type}
        label={label}
        value={displayValue}
        onChange={handleChange}
        onBlur={handleBlur}
        onFocus={handleFocus}
        maxLength={maxLength}
        className={className}
        classNames={{
          input: cn(
            error && touched && "text-red-700 dark:text-red-400",
            isValid && touched && "text-green-700 dark:text-green-400"
          ),
          inputWrapper: cn(
            "transition-all duration-200",
            error && touched && "border-red-500 focus-within:border-red-500",
            isValid && touched && !error && "border-green-500 focus-within:border-green-500"
          ),
        }}
        endContent={
          <div className="flex items-center gap-2">
            {/* Character Counter */}
            {showCharacterCounter && maxLength && (
              <span
                className={cn(
                  "text-xs font-medium transition-colors",
                  remainingChars !== null && remainingChars < 10
                    ? "text-amber-600 dark:text-amber-400"
                    : remainingChars === 0
                    ? "text-red-600 dark:text-red-400"
                    : "text-muted-foreground"
                )}
              >
                {characterCount}/{maxLength}
              </span>
            )}
            
            {/* Success/Error Indicator */}
            {touched && (
              <div className="flex items-center">
                {isValid && showSuccessIndicator && !error && (
                  <Check className="w-4 h-4 text-green-600 dark:text-green-400 animate-in zoom-in duration-200" />
                )}
                {error && (
                  <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 animate-in zoom-in duration-200" />
                )}
              </div>
            )}
          </div>
        }
      />

      {/* Helper Text / Format Hint */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 space-y-1">
          {/* Helper Text - shows when not focused or when no error */}
          {helperText && !error && (!showFormatHintOnFocus || !focused) && (
            <p className="text-xs text-muted-foreground flex items-center gap-1 animate-in fade-in duration-200">
              <Info className="w-3 h-3 shrink-0" />
              {helperText}
            </p>
          )}
          
          {/* Format Hint - shows on focus */}
          {formatHint && showFormatHintOnFocus && focused && !error && (
            <p className="text-xs text-muted-foreground flex items-center gap-1 animate-in fade-in duration-200">
              <Info className="w-3 h-3 shrink-0" />
              Format: <span className="font-mono font-medium">{formatHint}</span>
            </p>
          )}
          
          {/* Error Message - Progressive disclosure: only after blur/touch */}
          {error && touched && (
            <p className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1 animate-in slide-in-from-top-1 duration-200">
              <AlertCircle className="w-3 h-3 shrink-0" />
              {error}
            </p>
          )}
          
          {/* Success Message - subtle feedback */}
          {isValid && touched && !error && showSuccessIndicator && (
            <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1 animate-in fade-in duration-200">
              <Check className="w-3 h-3 shrink-0" />
              Looks good!
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

// Common validation rules
export const validationRules = {
  email: {
    validate: (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
    message: "That doesn't look quite right. Mind checking it once more?",
  },
  required: {
    validate: (value: string) => value.trim().length > 0,
    message: "Looks like something was skipped — can you fill this in?",
  },
  minLength: (min: number) => ({
    validate: (value: string) => value.length >= min,
    message: `Please enter at least ${min} characters`,
  }),
  phone: {
    validate: (value: string) => /^(\+?61|0)[2-478]( ?\d){8}$/.test(value.replace(/\s/g, "")),
    message: "Please enter a valid Australian phone number",
  },
  phoneAU: {
    validate: (value: string) => {
      const digits = value.replace(/\s/g, "")
      return /^04\d{8}$/.test(digits)
    },
    message: "Please enter a valid Australian mobile number (04XX XXX XXX)",
  },
  medicare: {
    validate: (value: string) => {
      const digits = value.replace(/\D/g, "")
      if (digits.length < 10) return false
      if (!/^[2-6]/.test(digits)) return false
      const weights = [1, 3, 7, 9, 1, 3, 7, 9]
      const sum = weights.reduce((acc, w, i) => acc + w * Number.parseInt(digits[i], 10), 0)
      return sum % 10 === Number.parseInt(digits[8], 10)
    },
    message: "Please check your Medicare number",
  },
}
