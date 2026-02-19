"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

/**
 * UIX Input - Native input with shadcn-compatible API
 * Premium input with enhanced focus states and soft radius
 */

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> {
  size?: "default" | "sm" | "lg"
  /** Content rendered before the input */
  startContent?: React.ReactNode
  /** Content rendered after the input */
  endContent?: React.ReactNode
  /** Label text */
  label?: string
  /** Description text below label */
  description?: string
  /** Error message */
  errorMessage?: string
  /** Mark as invalid */
  isInvalid?: boolean
}

const sizeClasses: Record<string, string> = {
  default: "h-10 text-base",
  sm: "h-9 text-sm",
  lg: "h-12 text-base",
}

export function Input({
  size = "default",
  className,
  startContent,
  endContent,
  label,
  description,
  errorMessage,
  isInvalid,
  id,
  ...props
}: InputProps) {
  const inputId = id || (label ? `uix-input-${label.toLowerCase().replace(/\s+/g, "-")}` : undefined)

  return (
    <div className={cn("w-full", className)}>
      {label && (
        <label
          htmlFor={inputId}
          className="block text-sm font-medium text-foreground/90 pb-1"
        >
          {label}
        </label>
      )}
      <div
        className={cn(
          "flex items-center w-full rounded-xl",
          "bg-background/60 backdrop-blur-sm",
          "border border-default-200/60",
          "transition-all duration-200 ease-out",
          "hover:border-primary/50",
          "focus-within:border-primary",
          "focus-within:shadow-[0_0_0_3px_rgba(37,99,235,0.12)]",
          isInvalid && "border-red-500 focus-within:border-red-500 focus-within:shadow-[0_0_0_3px_rgba(239,68,68,0.12)]",
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
          ref={undefined}
          aria-invalid={isInvalid || undefined}
          className={cn(
            "flex-1 bg-transparent px-3 py-2",
            "text-foreground placeholder:text-default-400",
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
      {description && !isInvalid && (
        <p className="text-muted-foreground text-sm mt-1">{description}</p>
      )}
      {isInvalid && errorMessage && (
        <p className="text-red-500 text-sm mt-1">{errorMessage}</p>
      )}
    </div>
  )
}

export { Input as UIXInput }
