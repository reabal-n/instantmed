"use client"

import * as React from "react"
import { Button as HeroButton, type ButtonProps as HeroButtonProps } from "@heroui/react"
import { Slot } from "@radix-ui/react-slot"
import { cn } from "@/lib/utils"
import { RippleEffect } from "./ripple-effect"

export interface ButtonProps extends Omit<HeroButtonProps, "variant" | "size" | "color"> {
  /** Accepts both shadcn variants and HeroUI variants for full compatibility */
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
    | "flat" | "bordered" | "solid" | "light" | "faded" | "shadow"
  size?: "default" | "sm" | "lg" | "icon" | "icon-sm" | "icon-lg"
  /** HeroUI color prop -- pass-through for HeroUI variants */
  color?: HeroButtonProps["color"]
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
  // HeroUI pass-through variants
  flat: "flat",
  bordered: "bordered",
  solid: "solid",
  light: "light",
  faded: "faded",
  shadow: "shadow",
}

const colorMap: Record<string, HeroButtonProps["color"] | undefined> = {
  default: "primary",
  destructive: "danger",
  outline: "primary",
  secondary: "secondary",
  ghost: "default",
  link: "primary",
  // HeroUI pass-through variants defer to explicit color prop
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

// Craft Design System variant styles - clean, no glow/transforms
const craftVariantStyles: Record<string, string> = {
  default: "shadow-sm hover:shadow-md transition-all duration-200",
  destructive: "shadow-sm hover:shadow-md transition-all duration-200",
  outline: "bg-white/80 dark:bg-white/5 border-border hover:bg-muted/50 transition-all duration-200",
  secondary: "hover:bg-secondary/80 transition-all duration-200",
  ghost: "hover:bg-muted/50 transition-all duration-200",
  link: "bg-transparent underline-offset-4 hover:underline text-primary hover:text-primary/80",
  // HeroUI pass-through variants use HeroUI's own styling
  flat: "transition-all duration-200",
  bordered: "transition-all duration-200",
  solid: "shadow-sm hover:shadow-md transition-all duration-200",
  light: "transition-all duration-200",
  faded: "transition-all duration-200",
  shadow: "transition-all duration-200",
}

// Size classes for asChild mode (since we can't use HeroUI's size prop)
const sizeClasses: Record<string, string> = {
  default: "h-10 px-4 py-2 text-sm",
  sm: "h-9 px-3 text-xs",
  lg: "h-11 px-8 text-base",
  icon: "h-10 w-10",
  "icon-sm": "h-9 w-9",
  "icon-lg": "h-11 w-11",
}

// Base button classes for asChild mode
const baseButtonClasses = cn(
  "inline-flex items-center justify-center gap-2",
  "font-sans font-semibold",
  "rounded-md", // Craft: restrained radius
  "select-none",
  "origin-center",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dawn-300 focus-visible:ring-offset-2",
  "disabled:pointer-events-none disabled:opacity-50",
)

function Button({
  variant = "default",
  size = "default",
  asChild = false,
  ripple = true,
  color,
  className,
  children,
  onClick,
  onPress,
  type,
  ...props
}: ButtonProps & { type?: "button" | "submit" | "reset" }) {
  // For asChild, render premium-styled Slot with all glass effects
  if (asChild) {
    const asChildClasses = cn(
      baseButtonClasses,
      sizeClasses[size],
      craftVariantStyles[variant],
      // Variant-specific colors for asChild
      variant === "default" && "bg-primary text-primary-foreground hover:bg-primary/90",
      variant === "destructive" && "bg-destructive text-destructive-foreground hover:bg-destructive/90",
      variant === "outline" && "border border-input text-foreground",
      variant === "secondary" && "bg-secondary text-secondary-foreground hover:bg-secondary/80",
      variant === "ghost" && "text-foreground hover:bg-accent hover:text-accent-foreground",
      variant === "link" && "text-primary underline-offset-4 hover:underline p-0 h-auto",
      className
    )
    return <Slot className={asChildClasses}>{children}</Slot>
  }

  const isIconOnly = size?.startsWith("icon")
  const heroSize = sizeMap[size || "default"]
  
  // Map onClick to onPress for HeroUI compatibility
  // HeroUI uses onPress instead of onClick
  // For type="submit", we need to manually trigger form submission since HeroUI's onPress doesn't do this
  const handlePress = (e: import("@react-types/shared").PressEvent) => {
    if (onPress) {
      onPress(e)
    } else if (onClick) {
      // Pass the native event from PressEvent if available, otherwise create minimal synthetic event
      // This ensures handlers that need event properties (e.g., stopPropagation) work correctly
      const nativeEvent = (e as { nativeEvent?: React.MouseEvent<HTMLButtonElement> }).nativeEvent
      if (nativeEvent) {
        onClick(nativeEvent)
      } else {
        // Fallback: create a minimal synthetic event with the target element
        const syntheticEvent = {
          target: e.target,
          currentTarget: e.target,
          preventDefault: () => {},
          stopPropagation: () => {},
          nativeEvent: {} as Event,
        } as unknown as React.MouseEvent<HTMLButtonElement>
        onClick(syntheticEvent)
      }
    }
    
    // Handle form submission for type="submit" buttons
    // HeroUI's onPress doesn't trigger native form submission
    if (type === "submit" && e.target instanceof HTMLElement) {
      const form = e.target.closest("form")
      if (form) {
        form.requestSubmit()
      }
    }
  }

  const buttonContent = (
    <HeroButton
      type={type || "button"}
      variant={variantMap[variant]}
      color={color ?? colorMap[variant]}
      size={heroSize}
      radius="md" // Craft: restrained radius
      isIconOnly={isIconOnly}
      onPress={handlePress}
      className={cn(
        // Base styles - Lumen typography
        "font-sans font-semibold",
        // Lumen variant styles
        craftVariantStyles[variant],
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
