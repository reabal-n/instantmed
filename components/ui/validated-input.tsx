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
  label: string
}

export function ValidatedInput({
  value,
  onChange,
  validationRules = [],
  validateOnChange = true,
  showSuccessIndicator = true,
  helperText,
  label,
  className,
  ...props
}: ValidatedInputProps) {
  const [touched, setTouched] = useState(false)

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
    onChange(e.target.value)
    if (!touched) setTouched(true)
  }

  const handleBlur = () => {
    if (!touched) setTouched(true)
  }

  return (
    <div className="space-y-1">
      <div className="relative">
        <Input
          {...props}
          label={label}
          value={value}
          onChange={handleChange}
          onBlur={handleBlur}
          className={cn(
            "transition-all duration-200",
            error && touched && "border-red-500",
            isValid && touched && "border-green-500",
            className
          )}
          classNames={{
            input: cn(
              error && touched && "text-red-700",
              isValid && touched && "text-green-700"
            ),
          }}
        />
        
        {/* Success/Error Indicator */}
        {touched && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
            {isValid && showSuccessIndicator && (
              <Check className="w-4 h-4 text-green-600 animate-in zoom-in duration-200" />
            )}
            {error && (
              <AlertCircle className="w-4 h-4 text-red-600 animate-in zoom-in duration-200" />
            )}
          </div>
        )}
      </div>

      {/* Helper Text */}
      {helperText && !error && !touched && (
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <Info className="w-3 h-3" />
          {helperText}
        </p>
      )}

      {/* Error Message */}
      {error && touched && (
        <p className="text-xs text-red-600 flex items-center gap-1 animate-in slide-in-from-top-1 duration-200">
          <AlertCircle className="w-3 h-3" />
          {error}
        </p>
      )}
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
