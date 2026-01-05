"use client"

import * as React from "react"
import { Chip as HeroChip, type ChipProps as HeroChipProps } from "@heroui/react"
import { cn } from "@/lib/utils"

export interface BadgeProps extends Omit<HeroChipProps, "variant" | "color"> {
  variant?: "default" | "secondary" | "destructive" | "outline"
  asChild?: boolean
}

const colorMap: Record<string, HeroChipProps["color"]> = {
  default: "primary",
  secondary: "secondary",
  destructive: "danger",
  outline: "default",
}

const variantMap: Record<string, HeroChipProps["variant"]> = {
  default: "solid",
  secondary: "flat",
  destructive: "solid",
  outline: "bordered",
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
      radius="md"
      className={cn("text-xs font-medium", className)}
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
}

export { Badge, badgeVariants }
