"use client"

import { useState } from "react"
import { Textarea as HeroTextarea, type TextAreaProps as HeroTextareaProps } from "@heroui/react"
import { AlertCircle, Check, Info } from "lucide-react"
import { cn } from "@/lib/utils"

interface EnhancedTextareaProps extends Omit<HeroTextareaProps, "onChange" | "value"> {
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
  const [focused, setFocused] = useState(false)
  const [touched, setTouched] = useState(false)
  
  const characterCount = value.length
  const remainingChars = maxLength ? maxLength - characterCount : null
  const isValid = maxLength ? characterCount <= maxLength && characterCount > 0 : value.length > 0
  const isNearLimit = remainingChars !== null && remainingChars < 20 && remainingChars > 0
  const isAtLimit = remainingChars === 0

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = (e.target as unknown as HTMLTextAreaElement).value
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
      <div className="relative">
        <HeroTextarea
          {...props}
          label={label || undefined}
          value={value}
          onChange={handleChange}
          onBlur={handleBlur}
          onFocus={() => setFocused(true)}
          maxLength={maxLength}
          variant="bordered"
          radius="lg"
          className={cn(
            "transition-all duration-200",
            className
          )}
          classNames={{
            base: "gap-0 bg-transparent",
            mainWrapper: "bg-transparent",
            inputWrapper: cn(
              "bg-white border border-slate-200 rounded-lg shadow-none",
              "transition-all duration-200",
              "hover:border-slate-300",
              "data-[focused=true]:border-primary data-[focused=true]:ring-1 data-[focused=true]:ring-primary/20",
              error && touched && "!border-red-500",
              isValid && touched && !error && showSuccessIndicator && "!border-green-500"
            ),
            innerWrapper: "bg-transparent",
            input: cn(
              "text-foreground placeholder:text-slate-400 bg-transparent",
              error && touched && "text-red-700 dark:text-red-400",
              isValid && touched && !error && showSuccessIndicator && "text-green-700 dark:text-green-400"
            ),
            label: "text-foreground font-medium",
            helperWrapper: "hidden", // Hide HeroUI's helper wrapper, we render our own
          }}
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
                ? "text-amber-600 dark:text-amber-400"
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

