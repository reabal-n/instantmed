"use client"

import * as React from "react"
import { DatePicker, type DatePickerProps } from "@heroui/react"
import { parseDate, getLocalTimeZone, today, type CalendarDate, type CalendarDateTime, type ZonedDateTime } from "@internationalized/date"

type DateValue = CalendarDate | CalendarDateTime | ZonedDateTime
import { cn } from "@/lib/utils"

export interface DatePickerFieldProps extends Omit<DatePickerProps, "value" | "onChange" | "defaultValue"> {
  /** Current value as ISO date string (YYYY-MM-DD) */
  value?: string
  /** Change handler with ISO date string */
  onChange?: (value: string | null) => void
  /** Default value as ISO date string */
  defaultValue?: string
  /** Minimum date as ISO string */
  minDate?: string
  /** Maximum date as ISO string */
  maxDate?: string
  /** Disable past dates */
  disablePast?: boolean
  /** Disable future dates */
  disableFuture?: boolean
  /** Label text */
  label?: string
  /** Placeholder text */
  placeholder?: string
  /** Error message */
  errorMessage?: string
  /** Whether the field is invalid */
  isInvalid?: boolean
  /** Whether the field is required */
  isRequired?: boolean
  /** Whether the field is disabled */
  isDisabled?: boolean
  /** Additional class name */
  className?: string
  /** Size variant */
  size?: "sm" | "md" | "lg"
}

/**
 * DatePickerField - HeroUI DatePicker wrapper with ISO string handling
 * 
 * Wraps HeroUI DatePicker with simpler string-based value handling,
 * making it easier to integrate with forms.
 * 
 * @example
 * ```tsx
 * <DatePickerField
 *   label="Start Date"
 *   value={startDate}
 *   onChange={setStartDate}
 *   disablePast
 *   isRequired
 * />
 * ```
 */
export function DatePickerField({
  value,
  onChange,
  defaultValue,
  minDate,
  maxDate,
  disablePast = false,
  disableFuture = false,
  label,
  placeholder = "Select date",
  errorMessage,
  isInvalid,
  isRequired,
  isDisabled,
  className,
  size = "md",
  ...props
}: DatePickerFieldProps) {
  // Convert ISO string to CalendarDate
  const parseISODate = React.useCallback((isoString: string | undefined): CalendarDate | undefined => {
    if (!isoString) return undefined
    try {
      return parseDate(isoString)
    } catch {
      return undefined
    }
  }, [])


  // Calculate min/max values
  const minValue = React.useMemo(() => {
    if (minDate) return parseISODate(minDate)
    if (disablePast) return today(getLocalTimeZone())
    return undefined
  }, [minDate, disablePast, parseISODate])

  const maxValue = React.useMemo(() => {
    if (maxDate) return parseISODate(maxDate)
    if (disableFuture) return today(getLocalTimeZone())
    return undefined
  }, [maxDate, disableFuture, parseISODate])

  // Handle value change
  const handleChange = React.useCallback(
    (date: DateValue | null) => {
      if (!date) {
        onChange?.(null)
        return
      }
      // Extract just the date part (YYYY-MM-DD) regardless of type
      onChange?.(date.toString().split("T")[0])
    },
    [onChange]
  )

  return (
    <DatePicker
      label={label}
      value={parseISODate(value) ?? null}
      defaultValue={parseISODate(defaultValue)}
      onChange={handleChange}
      minValue={minValue}
      maxValue={maxValue}
      placeholderValue={placeholder ? undefined : today(getLocalTimeZone())}
      isRequired={isRequired}
      isDisabled={isDisabled}
      isInvalid={isInvalid}
      errorMessage={errorMessage}
      size={size}
      classNames={{
        base: cn("w-full", className),
        label: "text-sm font-medium",
        inputWrapper: "bg-default-100 hover:bg-default-200",
      }}
      showMonthAndYearPickers
      {...props}
    />
  )
}
