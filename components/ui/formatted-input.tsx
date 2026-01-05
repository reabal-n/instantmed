"use client"

import { Input, InputProps } from "@heroui/react"
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

interface FormattedInputProps extends Omit<InputProps, "onChange" | "value"> {
  /** Format type */
  format?: FormatType
  /** Controlled value */
  value?: string
  /** Change handler - receives unformatted value */
  onChange?: (value: string) => void
  /** Get unformatted value for validation */
  getUnformattedValue?: (formatted: string) => string
}

export function FormattedInput({
  format = "none",
  value: controlledValue,
  onChange,
  getUnformattedValue,
  className,
  ...props
}: FormattedInputProps) {
  const [internalValue, setInternalValue] = useState("")

  const value = controlledValue !== undefined ? controlledValue : internalValue

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
    <Input
      {...props}
      value={value}
      onChange={handleChange}
      className={cn(
        "transition-all duration-200",
        "focus:scale-[1.01]",
        "focus:ring-4 focus:ring-primary/10",
        className
      )}
    />
  )
}

