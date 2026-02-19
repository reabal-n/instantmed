"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "secondary" | "destructive" | "outline" | "success"
  asChild?: boolean
}

// Craft Design System badge styles - no glow, subtle tints
const craftBadgeStyles: Record<string, string> = {
  default: "bg-primary/10 text-primary border border-primary/20",
  secondary: "bg-muted text-muted-foreground border border-border",
  destructive: "bg-destructive/10 text-destructive border border-destructive/20",
  outline: "bg-transparent border border-border text-foreground",
  success: "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800",
}

function Badge({
  className,
  variant = "default",
  asChild = false,
  children,
  ...props
}: BadgeProps) {
  if (asChild) {
    return <span className={className}>{children}</span>
  }

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-medium transition-colors",
        craftBadgeStyles[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  )
}

// Export badgeVariants for backward compatibility
const badgeVariants = {
  default: "default",
  secondary: "secondary",
  destructive: "destructive",
  outline: "outline",
  success: "success",
}

export { Badge, badgeVariants }
