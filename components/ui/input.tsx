"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> {
  size?: "default" | "sm" | "lg"
  /** Content rendered before the input (inside the wrapper) */
  startContent?: React.ReactNode
  /** Content rendered after the input (inside the wrapper) */
  endContent?: React.ReactNode
  /** Floating or static label */
  label?: string
  /** Mark input as invalid */
  isInvalid?: boolean
  /** Error message displayed below the input */
  errorMessage?: string
}

const sizeClasses: Record<string, string> = {
  default: "h-10 text-sm",
  sm: "h-9 text-xs",
  lg: "h-12 text-base",
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      size = "default",
      startContent,
      endContent,
      label,
      isInvalid,
      errorMessage,
      type,
      id,
      ...props
    },
    ref
  ) => {
    const inputId = id || (label ? `input-${label.toLowerCase().replace(/\s+/g, "-")}` : undefined)

    return (
      <div className={cn("w-full", className)}>
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-foreground/80 mb-1.5 font-sans"
          >
            {label}
          </label>
        )}
        <div
          className={cn(
            "flex items-center w-full rounded-md",
            "bg-white dark:bg-slate-900",
            "border border-slate-200 dark:border-slate-700",
            "shadow-none outline-none",
            "transition-all duration-200",
            "hover:border-slate-300 dark:hover:border-slate-600",
            "focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20",
            "min-h-[48px] md:min-h-0",
            isInvalid && "border-red-500 focus-within:border-red-500 focus-within:ring-red-500/20",
            sizeClasses[size]
          )}
        >
          {startContent && (
            <span className="flex items-center pl-3 text-muted-foreground">
              {startContent}
            </span>
          )}
          <input
            id={inputId}
            type={type}
            ref={ref}
            aria-invalid={isInvalid || undefined}
            className={cn(
              "flex-1 bg-transparent px-3 py-2",
              "text-foreground placeholder:text-muted-foreground/80",
              "font-sans",
              "border-none shadow-none outline-none",
              "disabled:cursor-not-allowed disabled:opacity-50",
              sizeClasses[size],
              startContent && "pl-2",
              endContent && "pr-2"
            )}
            {...props}
          />
          {endContent && (
            <span className="flex items-center pr-3 text-muted-foreground">
              {endContent}
            </span>
          )}
        </div>
        {isInvalid && errorMessage && (
          <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">
            {errorMessage}
          </p>
        )}
      </div>
    )
  }
)

Input.displayName = "Input"

export { Input }
