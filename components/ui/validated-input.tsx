"use client"

import { useState, useCallback } from "react"
import { Input } from "@heroui/react"
import { cn } from "@/lib/utils"
import { Check, AlertCircle } from "lucide-react"

type ValidationRule = {
  test: (value: string) => boolean
  message: string
}

interface ValidatedInputProps {
  label: string
  type?: string
  placeholder?: string
  value: string
  onValueChange: (value: string) => void
  isRequired?: boolean
  isDisabled?: boolean
  validationRules?: ValidationRule[]
  validateOnBlur?: boolean
  validateOnChange?: boolean
  showSuccessIcon?: boolean
  className?: string
}

export function ValidatedInput({
  label,
  type = "text",
  placeholder,
  value,
  onValueChange,
  isRequired = false,
  isDisabled = false,
  validationRules = [],
  validateOnBlur = true,
  validateOnChange = false,
  showSuccessIcon = true,
  className,
}: ValidatedInputProps) {
  const [touched, setTouched] = useState(false)
  const [focused, setFocused] = useState(false)

  const validate = useCallback(
    (val: string): { isValid: boolean; error?: string } => {
      if (isRequired && !val.trim()) {
        return { isValid: false, error: `${label} is required` }
      }
      for (const rule of validationRules) {
        if (!rule.test(val)) {
          return { isValid: false, error: rule.message }
        }
      }
      return { isValid: true }
    },
    [isRequired, label, validationRules]
  )

  const { isValid, error } = validate(value)
  const showError = touched && !focused && !isValid && value.length > 0
  const showSuccess = touched && isValid && value.length > 0 && showSuccessIcon

  const handleBlur = () => {
    setFocused(false)
    if (validateOnBlur) {
      setTouched(true)
    }
  }

  const handleFocus = () => {
    setFocused(true)
  }

  const handleChange = (newValue: string) => {
    onValueChange(newValue)
    if (validateOnChange) {
      setTouched(true)
    }
  }

  return (
    <div className={cn("relative", className)}>
      <Input
        label={label}
        type={type}
        placeholder={placeholder}
        value={value}
        onValueChange={handleChange}
        onBlur={handleBlur}
        onFocus={handleFocus}
        isRequired={isRequired}
        isDisabled={isDisabled}
        isInvalid={showError}
        errorMessage={showError ? error : undefined}
        variant="bordered"
        radius="lg"
        classNames={{
          inputWrapper: cn(
            "h-11 bg-white/50 backdrop-blur-sm transition-all duration-200",
            showError
              ? "border-red-500 hover:border-red-500 data-[focused=true]:border-red-500 animate-shake"
              : showSuccess
              ? "border-emerald-500 hover:border-emerald-500 data-[focused=true]:border-emerald-500"
              : "border-default-200 hover:border-primary data-[focused=true]:border-primary"
          ),
          errorMessage: "text-xs animate-fade-in",
        }}
        endContent={
          showSuccess ? (
            <div className="animate-scale-in">
              <Check className="w-4 h-4 text-emerald-500" />
            </div>
          ) : showError ? (
            <div className="animate-shake">
              <AlertCircle className="w-4 h-4 text-red-500" />
            </div>
          ) : null
        }
      />
    </div>
  )
}

// Common validation rules
export const emailRule: ValidationRule = {
  test: (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
  message: "Please enter a valid email address",
}

export const phoneRule: ValidationRule = {
  test: (value) => /^(\+?61|0)[2-478](\d{8})$/.test(value.replace(/\s/g, "")),
  message: "Please enter a valid Australian phone number",
}

export const medicareRule: ValidationRule = {
  test: (value) => {
    const cleaned = value.replace(/\s/g, "")
    if (!/^\d{10,11}$/.test(cleaned)) return false
    // Medicare checksum validation
    const weights = [1, 3, 7, 9, 1, 3, 7, 9]
    const digits = cleaned.slice(0, 8).split("").map(Number)
    const checkDigit = parseInt(cleaned[8], 10)
    const sum = digits.reduce((acc, d, i) => acc + d * weights[i], 0)
    return sum % 10 === checkDigit
  },
  message: "Please enter a valid Medicare number",
}

export const minLengthRule = (min: number): ValidationRule => ({
  test: (value) => value.length >= min,
  message: `Must be at least ${min} characters`,
})

export const maxLengthRule = (max: number): ValidationRule => ({
  test: (value) => value.length <= max,
  message: `Must be no more than ${max} characters`,
})
