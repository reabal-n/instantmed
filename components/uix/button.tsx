"use client"

import * as React from "react"
import { Button as HeroButton, type ButtonProps as HeroButtonProps } from "@heroui/react"
import { Slot } from "@radix-ui/react-slot"
import { cn } from "@/lib/utils"

/**
 * UIX Button - HeroUI Pro primary, shadcn-compatible API
 * Preserves all existing props and behavior while modernizing visuals
 */

export interface ButtonProps extends Omit<HeroButtonProps, "variant" | "size"> {
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
  size?: "default" | "sm" | "lg" | "icon" | "icon-sm" | "icon-lg"
  asChild?: boolean
  className?: string
  children?: React.ReactNode
}

const variantMap: Record<string, HeroButtonProps["variant"]> = {
  default: "solid",
  destructive: "solid",
  outline: "bordered",
  secondary: "flat",
  ghost: "light",
  link: "light",
}

const colorMap: Record<string, HeroButtonProps["color"]> = {
  default: "primary",
  destructive: "danger",
  outline: "primary",
  secondary: "secondary",
  ghost: "default",
  link: "primary",
}

const sizeMap: Record<string, HeroButtonProps["size"]> = {
  default: "md",
  sm: "sm",
  lg: "lg",
  icon: "md",
  "icon-sm": "sm",
  "icon-lg": "lg",
}

export function Button({
  variant = "default",
  size = "default",
  asChild = false,
  className,
  children,
  ...props
}: ButtonProps) {
  if (asChild) {
    return <Slot className={className}>{children}</Slot>
  }

  const isIconSize = size === "icon" || size === "icon-sm" || size === "icon-lg"

  return (
    <HeroButton
      variant={variantMap[variant]}
      color={colorMap[variant]}
      size={sizeMap[size]}
      radius="lg"
      isIconOnly={isIconSize}
      className={cn(
        "font-medium transition-all duration-200",
        variant === "link" && "underline-offset-4 hover:underline",
        className
      )}
      {...props}
    >
      {children}
    </HeroButton>
  )
}

export { Button as UIXButton }
