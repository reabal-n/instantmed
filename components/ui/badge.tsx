"use client"

import * as React from "react"
import { Chip as HeroChip, type ChipProps as HeroChipProps } from "@heroui/react"
import { cn } from "@/lib/utils"

export interface BadgeProps extends Omit<HeroChipProps, "variant" | "color"> {
  variant?: "default" | "secondary" | "destructive" | "outline" | "success"
  asChild?: boolean
}

const colorMap: Record<string, HeroChipProps["color"]> = {
  default: "primary",
  secondary: "secondary",
  destructive: "danger",
  outline: "default",
  success: "success",
}

const variantMap: Record<string, HeroChipProps["variant"]> = {
  default: "solid",
  secondary: "flat",
  destructive: "solid",
  outline: "bordered",
  success: "solid",
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
    <HeroChip
      variant={variantMap[variant]}
      color={colorMap[variant]}
      size="sm"
      radius="md" // Craft: restrained radius
      className={cn(
        "text-xs font-medium",
        // Craft badge styles (no glow)
        craftBadgeStyles[variant],
        className
      )}
      {...props}
    >
      {children}
    </HeroChip>
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
