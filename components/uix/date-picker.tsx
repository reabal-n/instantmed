"use client"

import * as React from "react"
import * as PopoverPrimitive from "@radix-ui/react-popover"
import { DayPicker } from "react-day-picker"
import { format, parse, startOfDay, isBefore, isAfter } from "date-fns"
import { CalendarIcon } from "lucide-react"
import { cn } from "@/lib/utils"

export interface DatePickerFieldProps {
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
 * DatePickerField - Date picker using react-day-picker with Radix Popover
 *
 * Wraps react-day-picker with simpler string-based value handling,
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
}: DatePickerFieldProps) {
  const [open, setOpen] = React.useState(false)

  // Convert ISO string to Date
  const parseISO = React.useCallback((iso: string | undefined): Date | undefined => {
    if (!iso) return undefined
    try {
      return parse(iso, "yyyy-MM-dd", new Date())
    } catch {
      return undefined
    }
  }, [])

  const selectedDate = parseISO(value) ?? parseISO(defaultValue)

  // Build disabled matcher for react-day-picker
  const disabledMatcher = React.useMemo(() => {
    const matchers: Array<(date: Date) => boolean> = []
    const now = startOfDay(new Date())

    if (disablePast) {
      matchers.push((date: Date) => isBefore(startOfDay(date), now))
    }
    if (disableFuture) {
      matchers.push((date: Date) => isAfter(startOfDay(date), now))
    }
    if (minDate) {
      const min = parse(minDate, "yyyy-MM-dd", new Date())
      matchers.push((date: Date) => isBefore(startOfDay(date), startOfDay(min)))
    }
    if (maxDate) {
      const max = parse(maxDate, "yyyy-MM-dd", new Date())
      matchers.push((date: Date) => isAfter(startOfDay(date), startOfDay(max)))
    }

    if (matchers.length === 0) return undefined
    return (date: Date) => matchers.some((m) => m(date))
  }, [disablePast, disableFuture, minDate, maxDate])

  const handleSelect = React.useCallback(
    (date: Date | undefined) => {
      if (!date) {
        onChange?.(null)
        return
      }
      onChange?.(format(date, "yyyy-MM-dd"))
      setOpen(false)
    },
    [onChange]
  )

  const sizeClasses = {
    sm: "h-8 text-sm px-2.5",
    md: "h-10 text-sm px-3",
    lg: "h-12 text-base px-4",
  }

  return (
    <div className={cn("flex flex-col gap-1.5 w-full", className)}>
      {label && (
        <label className="text-sm font-medium text-foreground">
          {label}
          {isRequired && <span className="text-destructive ml-0.5">*</span>}
        </label>
      )}

      <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
        <PopoverPrimitive.Trigger asChild disabled={isDisabled}>
          <button
            type="button"
            className={cn(
              "inline-flex items-center justify-between gap-2 rounded-xl border text-left transition-colors",
              "bg-default-100 hover:bg-default-200 focus:outline-none focus:ring-2 focus:ring-primary/40",
              sizeClasses[size],
              isInvalid && "border-destructive focus:ring-destructive/40",
              !isInvalid && "border-border",
              isDisabled && "opacity-50 cursor-not-allowed"
            )}
          >
            <span className={cn(!selectedDate && "text-muted-foreground")}>
              {selectedDate ? format(selectedDate, "MMM d, yyyy") : placeholder}
            </span>
            <CalendarIcon className="h-4 w-4 text-muted-foreground shrink-0" />
          </button>
        </PopoverPrimitive.Trigger>

        <PopoverPrimitive.Portal>
          <PopoverPrimitive.Content
            align="start"
            sideOffset={4}
            className={cn(
              "z-50 rounded-xl border bg-popover p-3 text-popover-foreground shadow-md",
              "animate-in fade-in-0 zoom-in-95",
              "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
              "data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2"
            )}
          >
            <DayPicker
              mode="single"
              selected={selectedDate}
              onSelect={handleSelect}
              disabled={disabledMatcher}
              defaultMonth={selectedDate}
              showOutsideDays
              classNames={{
                months: "flex flex-col sm:flex-row gap-2",
                month_caption: "flex justify-center pt-1 relative items-center mb-2",
                caption_label: "text-sm font-medium",
                nav: "flex items-center gap-1",
                button_previous:
                  "absolute left-1 top-0 inline-flex items-center justify-center rounded-md h-7 w-7 bg-transparent hover:bg-accent hover:text-accent-foreground",
                button_next:
                  "absolute right-1 top-0 inline-flex items-center justify-center rounded-md h-7 w-7 bg-transparent hover:bg-accent hover:text-accent-foreground",
                month_grid: "w-full border-collapse",
                weekdays: "flex",
                weekday: "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]",
                week: "flex w-full mt-1",
                day: "h-9 w-9 text-center text-sm relative flex items-center justify-center rounded-md transition-colors hover:bg-accent hover:text-accent-foreground focus-within:relative focus-within:z-20",
                day_button:
                  "h-9 w-9 p-0 font-normal inline-flex items-center justify-center rounded-md transition-colors",
                selected:
                  "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground rounded-md",
                today: "bg-accent text-accent-foreground font-semibold",
                outside: "text-muted-foreground/50",
                disabled: "text-muted-foreground/30 cursor-not-allowed",
                hidden: "invisible",
              }}
            />
          </PopoverPrimitive.Content>
        </PopoverPrimitive.Portal>
      </PopoverPrimitive.Root>

      {isInvalid && errorMessage && (
        <p className="text-xs text-destructive">{errorMessage}</p>
      )}
    </div>
  )
}
