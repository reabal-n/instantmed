"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

export interface LumenInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Input label */
  label?: string
  /** Helper text below input */
  helperText?: string
  /** Error message */
  error?: string
  /** Left icon/adornment */
  leftAdornment?: React.ReactNode
  /** Right icon/adornment */
  rightAdornment?: React.ReactNode
  /** Full width */
  fullWidth?: boolean
}

export const LumenInput = React.forwardRef<HTMLInputElement, LumenInputProps>(
  (
    {
      label,
      helperText,
      error,
      leftAdornment,
      rightAdornment,
      fullWidth = true,
      className,
      id,
      ...props
    },
    ref
  ) => {
    const generatedId = React.useId()
    const inputId = id || generatedId
    const hasError = Boolean(error)

    return (
      <div className={cn("flex flex-col gap-1.5", fullWidth && "w-full")}>
        {label && (
          <label
            htmlFor={inputId}
            className="text-sm font-sans font-medium text-foreground/80"
          >
            {label}
          </label>
        )}
        <div className="relative">
          {leftAdornment && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              {leftAdornment}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              // Base styles
              "w-full font-sans text-base",
              "rounded-xl",
              "px-4 py-3",
              // Lumen Glass surface
              "bg-white/65 dark:bg-slate-900/40",
              "backdrop-blur-lg",
              "border border-sky-300/30 dark:border-white/10",
              // Placeholder
              "placeholder:text-muted-foreground/60",
              // Transition
              "transition-all duration-300",
              // Hover
              "hover:border-sky-300/50",
              "hover:bg-white/75 dark:hover:bg-slate-900/50",
              // Focus - dawn glow
              "focus:outline-none",
              "focus:border-dawn-300/60",
              "focus:bg-white/85 dark:focus:bg-slate-900/60",
              "focus:shadow-[0_0_20px_rgba(245,169,98,0.15)]",
              // Error state
              hasError && [
                "border-[#E07A7A]/50",
                "focus:border-[#E07A7A]/60",
                "focus:shadow-[0_0_20px_rgba(224,122,122,0.15)]",
              ],
              // Adornment padding
              leftAdornment && "pl-10",
              rightAdornment && "pr-10",
              // Disabled
              "disabled:opacity-60 disabled:cursor-not-allowed",
              className
            )}
            aria-invalid={hasError}
            aria-describedby={
              hasError ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined
            }
            {...props}
          />
          {rightAdornment && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              {rightAdornment}
            </div>
          )}
        </div>
        {error && (
          <p
            id={`${inputId}-error`}
            className="text-sm text-[#E07A7A] font-sans"
            role="alert"
          >
            {error}
          </p>
        )}
        {helperText && !error && (
          <p
            id={`${inputId}-helper`}
            className="text-sm text-muted-foreground font-sans"
          >
            {helperText}
          </p>
        )}
      </div>
    )
  }
)

LumenInput.displayName = "LumenInput"
