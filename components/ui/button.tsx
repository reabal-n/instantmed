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

// Lumen Design System variant styles
const glassVariantStyles: Record<string, string> = {
  default: cn(
    // Dawn glow shadow - warm, not blue
    "shadow-[0_4px_20px_rgba(245,169,98,0.25)]",
    "hover:shadow-[0_8px_30px_rgba(245,169,98,0.30)]",
    // Lumen motion - gentle, intentional
    "transition-all duration-300 ease-out",
    "hover:-translate-y-0.5",
    "active:translate-y-0",
  ),
  destructive: cn(
    "shadow-[0_4px_20px_rgba(224,122,122,0.20)]",
    "hover:shadow-[0_8px_30px_rgba(224,122,122,0.25)]",
    "transition-all duration-300 ease-out",
    "hover:-translate-y-0.5",
    "active:translate-y-0",
  ),
  outline: cn(
    // Lumen Glass surface
    "bg-white/75 dark:bg-slate-900/60",
    "backdrop-blur-xl",
    "border-sky-300/40 dark:border-white/10",
    "hover:bg-white/85 dark:hover:bg-slate-900/70",
    "hover:shadow-[0_8px_30px_rgba(197,221,240,0.20)]",
    "transition-all duration-300 ease-out",
    "hover:-translate-y-0.5",
    "active:translate-y-0",
  ),
  secondary: cn(
    // Lumen Glass surface - sky tone
    "bg-white/60 dark:bg-slate-900/50",
    "backdrop-blur-lg",
    "shadow-[0_4px_20px_rgba(197,221,240,0.15)]",
    "hover:shadow-[0_8px_30px_rgba(197,221,240,0.20)]",
    "transition-all duration-300 ease-out",
    "hover:-translate-y-0.5",
    "active:translate-y-0",
  ),
  ghost: cn(
    "hover:bg-dawn-50 dark:hover:bg-dawn-500/10",
    "transition-all duration-300 ease-out",
    "hover:-translate-y-0.5",
    "active:translate-y-0",
  ),
  link: cn(
    "bg-transparent hover:bg-transparent",
    "underline-offset-4 hover:underline",
    "text-dawn-600 hover:text-dawn-700",
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
        // Base styles - Lumen typography
        "font-sans font-semibold",
        // Lumen variant styles
        glassVariantStyles[variant],
        // Ensure minimum touch target on mobile (accessibility)
        "min-h-[44px] min-w-[44px] md:min-h-0 md:min-w-0",
        // Prevent text selection on mobile
        "select-none",
        // Smooth transform origin
        "origin-center",
        // Accessibility: Focus visible styles - dawn ring
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dawn-300 focus-visible:ring-offset-2",
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
        color={variant === "default" ? "rgba(255, 255, 255, 0.4)" : "rgba(245, 169, 98, 0.15)"}
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
