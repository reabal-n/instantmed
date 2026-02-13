"use client"

import * as React from "react"
import { Button as HeroButton, type ButtonProps as HeroButtonProps } from "@heroui/react"
import { Slot } from "@radix-ui/react-slot"
import { cn } from "@/lib/utils"

/**
 * UIX Button - HeroUI Pro primary, shadcn-compatible API
 * Premium, modern styling with soft radius
 */

export interface ButtonProps extends Omit<HeroButtonProps, "variant" | "size"> {
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link" | "flat" | "bordered" | "solid" | "light" | "faded" | "shadow"
  size?: "default" | "sm" | "lg" | "icon" | "icon-sm" | "icon-lg"
  asChild?: boolean
  className?: string
  children?: React.ReactNode
  /** Use pill shape (full rounded) for CTA buttons */
  pill?: boolean
}

const variantMap: Record<string, HeroButtonProps["variant"]> = {
  default: "solid",
  destructive: "solid",
  outline: "bordered",
  secondary: "flat",
  ghost: "light",
  link: "light",
  // HeroUI pass-through variants
  flat: "flat",
  bordered: "bordered",
  solid: "solid",
  light: "light",
  faded: "faded",
  shadow: "shadow",
}

const colorMap: Record<string, HeroButtonProps["color"]> = {
  default: "primary",
  destructive: "danger",
  outline: "primary",
  secondary: "secondary",
  ghost: "default",
  link: "primary",
  // HeroUI pass-through variants use their own color prop
  flat: undefined,
  bordered: undefined,
  solid: undefined,
  light: undefined,
  faded: undefined,
  shadow: undefined,
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
  pill = false,
  ...props
}: ButtonProps) {
  if (asChild) {
    return <Slot className={className}>{children}</Slot>
  }

  const isIconSize = size === "icon" || size === "icon-sm" || size === "icon-lg"

  return (
    <HeroButton
      variant={variantMap[variant]}
      color={props.color ?? colorMap[variant]}
      size={sizeMap[size]}
      radius={pill ? "full" : "lg"}
      isIconOnly={isIconSize}
      className={cn(
        "font-medium transition-all duration-200 ease-out",
        "hover:-translate-y-0.5 active:scale-[0.98]",
        variant === "default" && "shadow-md hover:shadow-lg",
        variant === "link" && "underline-offset-4 hover:underline shadow-none hover:shadow-none",
        variant === "ghost" && "shadow-none hover:shadow-sm",
        className
      )}
      {...props}
    >
      {children}
    </HeroButton>
  )
}

export { Button as UIXButton }
