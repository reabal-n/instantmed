"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

export interface TextareaProps
  extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "onChange"> {
  size?: "default" | "sm" | "lg"
  /** Standard change handler -- accepts both HTMLTextAreaElement and HTMLInputElement for backward compat */
  onChange?: React.ChangeEventHandler<HTMLTextAreaElement | HTMLInputElement>
  /** Preferred callback -- receives the string value directly */
  onValueChange?: (value: string) => void
  /** Floating or static label */
  label?: string
  /** Minimum visible rows (sets min-height) */
  minRows?: number
}

const sizeClasses: Record<string, string> = {
  default: "text-sm min-h-[100px]",
  sm: "text-xs min-h-[80px]",
  lg: "text-base min-h-[140px]",
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      className,
      size = "default",
      onChange,
      onValueChange,
      label,
      minRows,
      style,
      ...props
    },
    ref
  ) => {
    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onChange?.(e)
      onValueChange?.(e.target.value)
    }

    // Convert minRows to a min-height via style if provided
    const minRowStyle = minRows
      ? { minHeight: `${minRows * 1.5}em`, ...style }
      : style

    return (
      <div className={cn("w-full", className)}>
        {label && (
          <label className="block text-sm font-medium text-foreground/80 mb-1.5">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          onChange={handleChange}
          style={minRowStyle}
          className={cn(
            "w-full rounded-md px-3 py-2",
            "bg-white dark:bg-slate-900",
            "border border-border",
            "text-foreground placeholder:text-muted-foreground/50",
            "font-sans",
            "shadow-none outline-none",
            "transition-all duration-200",
            "hover:border-slate-300 dark:hover:border-slate-600",
            "focus:border-primary focus:ring-2 focus:ring-primary/20",
            "disabled:cursor-not-allowed disabled:opacity-50",
            "resize-y",
            sizeClasses[size]
          )}
          {...props}
        />
      </div>
    )
  }
)

Textarea.displayName = "Textarea"

export { Textarea }
