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

// Soft Pop Glass glow colors for badges
const glowStyles: Record<string, string> = {
  default: "shadow-[0_4px_16px_rgba(59,130,246,0.25)]",
  secondary: "shadow-[0_4px_16px_rgba(139,92,246,0.2)]",
  destructive: "shadow-[0_4px_16px_rgba(239,68,68,0.25)]",
  outline: "",
  success: "shadow-[0_4px_16px_rgba(34,197,94,0.25)]",
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
      radius="full" // Soft Pop Glass: pill-shaped badges
      className={cn(
        "text-xs font-semibold",
        // Soft Pop Glass glow
        glowStyles[variant],
        // Glass effect for outline variant
        variant === "outline" && [
          "bg-white/60 dark:bg-gray-900/40",
          "backdrop-blur-lg",
          "border-white/40 dark:border-white/10",
        ],
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
