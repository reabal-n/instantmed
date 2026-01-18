"use client"

import type React from "react"
import { forwardRef } from "react"
import { cn } from "@/lib/utils"

interface MobileInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

export const MobileInput = forwardRef<HTMLInputElement, MobileInputProps>(
  ({ label, error, hint, leftIcon, rightIcon, className, type, inputMode, ...props }, ref) => {
    // Auto-detect inputMode based on type
    const resolvedInputMode = inputMode || (type === "tel" || type === "number" ? "numeric" : undefined)

    return (
      <div className="w-full">
        {label && <label className="block text-sm font-medium text-foreground mb-1.5">{label}</label>}
        <div className="relative">
          {leftIcon && <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">{leftIcon}</div>}
          <input
            ref={ref}
            type={type}
            inputMode={resolvedInputMode}
            className={cn(
              // Base styles - 16px font minimum to prevent iOS zoom
              "w-full rounded-xl border bg-background px-4 py-3.5 text-base font-normal",
              "transition-all duration-150 outline-none",
              // Focus state - border only, no ring (single visual boundary)
              "focus:border-primary",
              // Error state
              error && "border-destructive focus:border-destructive",
              // Icon padding
              leftIcon && "pl-10",
              rightIcon && "pr-10",
              // Touch target: minimum 44px height
              "min-h-[48px]",
              className,
            )}
            aria-invalid={!!error}
            aria-describedby={error ? `${props.id}-error` : hint ? `${props.id}-hint` : undefined}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">{rightIcon}</div>
          )}
        </div>
        {error && (
          <p id={`${props.id}-error`} className="mt-1.5 text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
        {hint && !error && (
          <p id={`${props.id}-hint`} className="mt-1.5 text-xs text-muted-foreground">
            {hint}
          </p>
        )}
      </div>
    )
  },
)
MobileInput.displayName = "MobileInput"
