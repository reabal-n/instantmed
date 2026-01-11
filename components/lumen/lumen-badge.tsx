"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

export interface LumenBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  children: React.ReactNode
  /** Badge variant */
  variant?: "default" | "success" | "warning" | "error" | "info"
  /** Badge size */
  size?: "sm" | "md"
  /** Dot indicator */
  dot?: boolean
}

const variantStyles = {
  default: cn(
    "bg-ivory-100 text-foreground",
    "border border-sky-300/30",
  ),
  success: cn(
    "bg-[#6BBF8A]/15 text-[#4A9968]",
    "border border-[#6BBF8A]/30",
  ),
  warning: cn(
    "bg-dawn-100 text-dawn-700",
    "border border-dawn-300/30",
  ),
  error: cn(
    "bg-[#E07A7A]/15 text-[#C25555]",
    "border border-[#E07A7A]/30",
  ),
  info: cn(
    "bg-sky-100 text-sky-600",
    "border border-sky-300/30",
  ),
}

const dotColors = {
  default: "bg-foreground/60",
  success: "bg-[#6BBF8A]",
  warning: "bg-dawn-500",
  error: "bg-[#E07A7A]",
  info: "bg-sky-500",
}

const sizeStyles = {
  sm: "px-2 py-0.5 text-xs",
  md: "px-2.5 py-1 text-sm",
}

export function LumenBadge({
  children,
  variant = "default",
  size = "sm",
  dot = false,
  className,
  ...props
}: LumenBadgeProps) {
  return (
    <span
      className={cn(
        // Base styles
        "inline-flex items-center gap-1.5",
        "font-sans font-medium",
        "rounded-full",
        // Variant and size
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      {...props}
    >
      {dot && (
        <span
          className={cn(
            "w-1.5 h-1.5 rounded-full",
            dotColors[variant]
          )}
          aria-hidden="true"
        />
      )}
      {children}
    </span>
  )
}
