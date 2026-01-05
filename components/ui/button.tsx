"use client"

import * as React from "react"
import { Button as HeroButton, type ButtonProps as HeroButtonProps } from "@heroui/react"
import { Slot } from "@radix-ui/react-slot"
import { cn } from "@/lib/utils"
import { RippleEffect } from "./ripple-effect"

export interface ButtonProps extends Omit<HeroButtonProps, "variant" | "size" | "color"> {
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
  size?: "default" | "sm" | "lg" | "icon" | "icon-sm" | "icon-lg"
  asChild?: boolean
  /** Enable ripple effect on click */
  ripple?: boolean
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
  ripple = true,
  className,
  children,
  ...props
}: ButtonProps) {
  if (asChild) {
    return <Slot className={className}>{children}</Slot>
  }

  const isIconOnly = size?.startsWith("icon")
  const heroSize = sizeMap[size || "default"]

  const buttonContent = (
    <HeroButton
      variant={variantMap[variant]}
      color={colorMap[variant]}
      size={heroSize}
      radius="lg"
      isIconOnly={isIconOnly}
      className={cn(
        variant === "link" && "bg-transparent hover:bg-transparent underline-offset-4 hover:underline",
        // Enhanced micro-interactions: magnetic effect with glow
        "transition-all duration-300 ease-out",
        "hover:scale-[1.02] hover:shadow-lg hover:shadow-primary/20",
        "active:scale-[0.98]",
        // Glow effect for primary buttons
        variant === "default" && "hover:ring-2 hover:ring-primary/20",
        // Ensure minimum touch target on mobile (accessibility)
        "min-h-[44px] min-w-[44px] md:min-h-0 md:min-w-0",
        // Better mobile tap feedback
        "active:opacity-80 md:active:opacity-100",
        // Prevent text selection on mobile
        "select-none",
        // Smooth transform origin
        "origin-center",
        // Accessibility: Focus visible styles
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
        className
      )}
      {...props}
    >
      {children}
    </HeroButton>
  )

  if (ripple && variant !== "link") {
    return (
      <RippleEffect
        enabled={ripple}
        color={variant === "default" ? "rgba(255, 255, 255, 0.5)" : "rgba(0, 0, 0, 0.1)"}
      >
        {buttonContent}
      </RippleEffect>
    )
  }

  return buttonContent
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
