"use client"

import { useState, useCallback } from "react"
import {
  formatMedicareNumber,
  formatPhoneNumber,
  formatPostcode,
  formatCreditCard,
  formatExpiryDate,
  formatDateInput,
  formatIRN,
  getUnformattedMedicare,
  getUnformattedPhone,
} from "@/lib/utils/form-formatting"
import { cn } from "@/lib/utils"

type FormatType =
  | "medicare"
  | "phone"
  | "postcode"
  | "credit-card"
  | "expiry"
  | "date"
  | "irn"
  | "none"

interface FormattedInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value" | "size"> {
  /** Format type */
  format?: FormatType
  /** Controlled value */
  value?: string
  /** Change handler - receives unformatted value */
  onChange?: (value: string) => void
  /** Get unformatted value for validation */
  getUnformattedValue?: (formatted: string) => string
  /** Label text */
  label?: string
  /** Mark as invalid */
  isInvalid?: boolean
  /** Error message */
  errorMessage?: string
}

export function FormattedInput({
  format = "none",
  value: controlledValue,
  onChange,
  getUnformattedValue,
  className,
  label,
  isInvalid,
  errorMessage,
  id,
  ...props
}: FormattedInputProps) {
  const [internalValue, setInternalValue] = useState("")

  const value = controlledValue !== undefined ? controlledValue : internalValue
  const inputId = id || (label ? `formatted-input-${label.toLowerCase().replace(/\s+/g, "-")}` : undefined)

  const formatValue = useCallback(
    (inputValue: string): string => {
      switch (format) {
        case "medicare":
          return formatMedicareNumber(inputValue)
        case "phone":
          return formatPhoneNumber(inputValue)
        case "postcode":
          return formatPostcode(inputValue)
        case "credit-card":
          return formatCreditCard(inputValue)
        case "expiry":
          return formatExpiryDate(inputValue)
        case "date":
          return formatDateInput(inputValue)
        case "irn":
          return formatIRN(inputValue)
        default:
          return inputValue
      }
    },
    [format]
  )

  const getUnformatted = useCallback(
    (formatted: string): string => {
      if (getUnformattedValue) {
        return getUnformattedValue(formatted)
      }

      switch (format) {
        case "medicare":
          return getUnformattedMedicare(formatted)
        case "phone":
          return getUnformattedPhone(formatted)
        case "postcode":
        case "credit-card":
        case "expiry":
        case "date":
        case "irn":
          return formatted.replace(/\D/g, "")
        default:
          return formatted
      }
    },
    [format, getUnformattedValue]
  )

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const inputValue = e.target.value
      const formatted = formatValue(inputValue)
      const unformatted = getUnformatted(formatted)

      if (controlledValue === undefined) {
        setInternalValue(formatted)
      }

      onChange?.(unformatted)
    },
    [formatValue, getUnformatted, onChange, controlledValue]
  )

  return (
    <div className={cn("w-full", className)}>
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-foreground/80 mb-1.5">
          {label}
        </label>
      )}
      <input
        {...props}
        id={inputId}
        value={value}
        onChange={handleChange}
        aria-invalid={isInvalid || undefined}
        className={cn(
          "w-full rounded-md px-3 py-2 h-10",
          "bg-white dark:bg-slate-900",
          "border border-slate-200 dark:border-slate-700",
          "text-foreground placeholder:text-muted-foreground/80",
          "font-sans text-base md:text-sm",
          "shadow-none outline-none",
          "transition-all duration-200",
          "hover:border-slate-300 dark:hover:border-slate-600",
          "focus:border-primary focus:ring-2 focus:ring-primary/20",
          "disabled:cursor-not-allowed disabled:opacity-50",
          isInvalid && "!border-red-500 focus:!border-red-500 focus:!ring-red-500/20"
        )}
      />
      {isInvalid && errorMessage && (
        <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">{errorMessage}</p>
      )}
    </div>
  )
}
