"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "secondary" | "destructive" | "outline" | "success" | "price" | "warning" | "info"
  /** rounded-md (default) or rounded-full pill shape */
  shape?: "badge" | "pill"
  size?: "sm" | "default" | "lg"
  /** Optional leading icon */
  icon?: React.ReactNode
  asChild?: boolean
}

const variantStyles: Record<string, string> = {
  default: "bg-primary/10 text-primary border border-primary/20",
  secondary: "bg-muted text-muted-foreground border border-border",
  destructive: "bg-destructive/10 text-destructive border border-destructive/20",
  outline: "bg-transparent border border-border text-foreground",
  success: "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800",
  price: "bg-emerald-500/10 text-emerald-700 border border-emerald-500/20 dark:text-emerald-400 font-semibold",
  warning: "bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-800",
  info: "bg-sky-50 text-sky-700 border border-sky-200 dark:bg-sky-950 dark:text-sky-400 dark:border-sky-800",
}

const shapeStyles: Record<string, string> = {
  badge: "rounded-md",
  pill: "rounded-full",
}

const sizeStyles: Record<string, string> = {
  sm: "px-2 py-0.5 text-[11px]",
  default: "px-2.5 py-0.5 text-xs",
  lg: "px-3.5 py-1.5 text-sm",
}

function Badge({
  className,
  variant = "default",
  shape = "badge",
  size = "default",
  icon,
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
        "inline-flex items-center gap-1.5 font-medium transition-colors",
        variantStyles[variant],
        shapeStyles[shape],
        sizeStyles[size],
        className
      )}
      {...props}
    >
      {icon && <span className="shrink-0">{icon}</span>}
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
  price: "price",
  warning: "warning",
  info: "info",
}

export { Badge, badgeVariants }
