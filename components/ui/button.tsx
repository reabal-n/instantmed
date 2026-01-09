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

// Soft Pop Glass variant styles
const glassVariantStyles: Record<string, string> = {
  default: cn(
    // Glow shadow - colored, not black
    "shadow-[0_8px_30px_rgb(59,130,246,0.25)]",
    "hover:shadow-[0_12px_40px_rgb(59,130,246,0.35)]",
    // Spring motion
    "transition-all duration-200 ease-out",
    "hover:scale-[1.02]",
    "active:scale-[0.98]",
  ),
  destructive: cn(
    "shadow-[0_8px_30px_rgb(239,68,68,0.25)]",
    "hover:shadow-[0_12px_40px_rgb(239,68,68,0.35)]",
    "transition-all duration-200 ease-out",
    "hover:scale-[1.02]",
    "active:scale-[0.98]",
  ),
  outline: cn(
    // Glass surface
    "bg-white/70 dark:bg-gray-900/60",
    "backdrop-blur-xl",
    "border-white/40 dark:border-white/10",
    "hover:bg-white/90 dark:hover:bg-gray-900/80",
    "hover:shadow-[0_8px_30px_rgb(59,130,246,0.15)]",
    "transition-all duration-200 ease-out",
    "hover:scale-[1.02]",
    "active:scale-[0.98]",
  ),
  secondary: cn(
    // Glass surface
    "bg-white/60 dark:bg-gray-900/50",
    "backdrop-blur-lg",
    "shadow-[0_8px_30px_rgb(139,92,246,0.15)]",
    "hover:shadow-[0_12px_40px_rgb(139,92,246,0.25)]",
    "transition-all duration-200 ease-out",
    "hover:scale-[1.02]",
    "active:scale-[0.98]",
  ),
  ghost: cn(
    "hover:bg-primary/5",
    "transition-all duration-200 ease-out",
    "hover:scale-[1.02]",
    "active:scale-[0.98]",
  ),
  link: cn(
    "bg-transparent hover:bg-transparent",
    "underline-offset-4 hover:underline",
  ),
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
      radius="full" // Soft Pop Glass: pill-shaped buttons
      isIconOnly={isIconOnly}
      className={cn(
        // Base styles
        "font-semibold",
        // Soft Pop Glass variant styles
        glassVariantStyles[variant],
        // Ensure minimum touch target on mobile (accessibility)
        "min-h-[44px] min-w-[44px] md:min-h-0 md:min-w-0",
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
        color={variant === "default" ? "rgba(255, 255, 255, 0.5)" : "rgba(59, 130, 246, 0.2)"}
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
