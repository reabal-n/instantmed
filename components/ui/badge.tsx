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
  destructive: "bg-destructive-light text-destructive border border-destructive-border",
  outline: "bg-transparent border border-border text-foreground",
  success: "bg-success-light text-success border border-success-border",
  price: "bg-success/10 text-success border border-success/20 font-semibold",
  warning: "bg-warning-light text-warning border border-warning-border",
  info: "bg-info-light text-info border border-info-border",
}

const shapeStyles: Record<string, string> = {
  badge: "rounded-md",
  pill: "rounded-full",
}

const sizeStyles: Record<string, string> = {
  sm: "px-2 py-0.5 text-[11px]",
  default: "px-3 py-1 text-xs",
  lg: "px-4 py-1.5 text-sm",
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
