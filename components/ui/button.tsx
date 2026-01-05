"use client"

import * as React from "react"
import { Button as HeroButton, type ButtonProps as HeroButtonProps } from "@heroui/react"
import { Slot } from "@radix-ui/react-slot"
import { cn } from "@/lib/utils"

export interface ButtonProps extends Omit<HeroButtonProps, "variant" | "size" | "color"> {
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
  size?: "default" | "sm" | "lg" | "icon" | "icon-sm" | "icon-lg"
  asChild?: boolean
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

function Button({
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

  const isIconOnly = size?.startsWith("icon")
  const heroSize = sizeMap[size || "default"]

  return (
    <HeroButton
      variant={variantMap[variant]}
      color={colorMap[variant]}
      size={heroSize}
      radius="lg"
      isIconOnly={isIconOnly}
      className={cn(
        variant === "link" && "bg-transparent hover:bg-transparent underline-offset-4 hover:underline",
        // Micro-interactions: subtle scale and shadow on hover/active
        "transition-all duration-200",
        "hover:scale-[1.02] hover:shadow-soft-md",
        "active:scale-[0.98]",
        // Ensure minimum touch target on mobile
        "min-h-[44px] md:min-h-0",
        className
      )}
      {...props}
    >
      {children}
    </HeroButton>
  )
}

// Export buttonVariants for backward compatibility
const buttonVariants = {
  default: "default",
  destructive: "destructive",
  outline: "outline",
  secondary: "secondary",
  ghost: "ghost",
  link: "link",
}

export { Button, buttonVariants }
