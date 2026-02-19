"use client"

import { useState } from "react"
import { AlertCircle, Check, Info } from "lucide-react"
import { cn } from "@/lib/utils"

interface EnhancedTextareaProps extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "onChange" | "value"> {
  value: string
  onChange: (value: string) => void
  maxLength?: number
  showCharacterCounter?: boolean
  helperText?: string
  error?: string
  showSuccessIndicator?: boolean
  label: string
}

export function EnhancedTextarea({
  value,
  onChange,
  maxLength,
  showCharacterCounter = true,
  helperText,
  error,
  showSuccessIndicator = false,
  label,
  className,
  ...props
}: EnhancedTextareaProps) {
  const [_focused, setFocused] = useState(false)
  const [touched, setTouched] = useState(false)

  const characterCount = value.length
  const remainingChars = maxLength ? maxLength - characterCount : null
  const isValid = maxLength ? characterCount <= maxLength && characterCount > 0 : value.length > 0
  const isNearLimit = remainingChars !== null && remainingChars < 20 && remainingChars > 0
  const isAtLimit = remainingChars === 0

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value
    // Respect maxLength if provided
    if (maxLength && newValue.length > maxLength) {
      return
    }
    onChange(newValue)
    if (!touched) setTouched(true)
  }

  const handleBlur = () => {
    setFocused(false)
    if (!touched) setTouched(true)
  }

  return (
    <div className="space-y-1.5">
      {/* overflow-visible prevents bottom border clipping */}
      <div className="relative overflow-visible">
        {label && (
          <label className="block text-sm font-medium text-foreground mb-1.5">
            {label}
          </label>
        )}
        <textarea
          {...props}
          value={value}
          onChange={handleChange}
          onBlur={handleBlur}
          onFocus={() => setFocused(true)}
          maxLength={maxLength}
          className={cn(
            "w-full rounded-lg px-3 py-2",
            "bg-white/90 dark:bg-white/5",
            "border border-slate-200 dark:border-slate-700",
            "shadow-none outline-none",
            "min-h-[120px]",
            "transition-all duration-200",
            "hover:border-slate-300 dark:hover:border-slate-600",
            "focus:border-primary focus:ring-0",
            "text-foreground placeholder:text-slate-400",
            "font-sans text-base md:text-sm",
            "resize-y",
            error && touched && "!border-red-500",
            isValid && touched && !error && showSuccessIndicator && "!border-green-500",
            error && touched && "text-red-700 dark:text-red-400",
            isValid && touched && !error && showSuccessIndicator && "text-green-700 dark:text-green-400",
            className
          )}
        />

        {/* Success/Error Indicator */}
        {touched && (
          <div className="absolute right-3 top-3 pointer-events-none">
            {isValid && showSuccessIndicator && !error && (
              <Check className="w-4 h-4 text-green-600 dark:text-green-400 animate-in zoom-in duration-200" />
            )}
            {error && (
              <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 animate-in zoom-in duration-200" />
            )}
          </div>
        )}
      </div>

      {/* Helper Text / Character Counter / Error */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 space-y-1">
          {/* Helper Text */}
          {helperText && !error && (!touched || isValid) && (
            <p className="text-xs text-muted-foreground flex items-center gap-1 animate-in fade-in duration-200">
              <Info className="w-3 h-3 shrink-0" />
              {helperText}
            </p>
          )}

          {/* Error Message */}
          {error && touched && (
            <p className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1 animate-in slide-in-from-top-1 duration-200">
              <AlertCircle className="w-3 h-3 shrink-0" />
              {error}
            </p>
          )}

          {/* Success Message */}
          {isValid && touched && !error && showSuccessIndicator && (
            <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1 animate-in fade-in duration-200">
              <Check className="w-3 h-3 shrink-0" />
              Looks good!
            </p>
          )}
        </div>

        {/* Character Counter */}
        {showCharacterCounter && maxLength && (
          <span
            className={cn(
              "text-xs font-medium transition-colors shrink-0",
              isAtLimit
                ? "text-red-600 dark:text-red-400"
                : isNearLimit
                ? "text-dawn-600 dark:text-dawn-400"
                : "text-muted-foreground"
            )}
          >
            {characterCount}/{maxLength}
          </span>
        )}
      </div>
    </div>
  )
}
