"use client"

import * as React from "react"
import { Button as HeroButton, type ButtonProps as HeroButtonProps } from "@heroui/react"
import { Slot } from "@radix-ui/react-slot"
import { cn } from "@/lib/utils"

export interface ButtonProps extends Omit<HeroButtonProps, "variant" | "size"> {
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
  size?: "default" | "sm" | "lg" | "icon"
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

  // Soft Pop Glass styling
  const glassStyles = {
    default: cn(
      // Glow effect - colored shadow instead of black
      "shadow-[0_8px_30px_rgb(59,130,246,0.25)]",
      "hover:shadow-[0_12px_40px_rgb(59,130,246,0.35)]",
      // Motion
      "transition-all duration-200 ease-out",
      "hover:-translate-y-0.5",
      "active:scale-[0.98]",
    ),
    destructive: cn(
      "shadow-[0_8px_30px_rgb(239,68,68,0.25)]",
      "hover:shadow-[0_12px_40px_rgb(239,68,68,0.35)]",
      "transition-all duration-200 ease-out",
      "hover:-translate-y-0.5",
      "active:scale-[0.98]",
    ),
    outline: cn(
      // Glass surface
      "bg-white/70 dark:bg-slate-900/60",
      "backdrop-blur-xl",
      "border-white/40 dark:border-white/10",
      "hover:bg-white/90 dark:hover:bg-slate-900/80",
      "hover:shadow-[0_8px_30px_rgb(59,130,246,0.15)]",
      "transition-all duration-200 ease-out",
      "hover:-translate-y-0.5",
      "active:scale-[0.98]",
    ),
    secondary: cn(
      // Glass surface for secondary
      "bg-white/60 dark:bg-slate-900/50",
      "backdrop-blur-lg",
      "shadow-[0_8px_30px_rgb(139,92,246,0.15)]",
      "hover:shadow-[0_12px_40px_rgb(139,92,246,0.25)]",
      "transition-all duration-200 ease-out",
      "hover:-translate-y-0.5",
      "active:scale-[0.98]",
    ),
    ghost: cn(
      "hover:bg-primary/5",
      "transition-all duration-200 ease-out",
      "hover:-translate-y-0.5",
      "active:scale-[0.98]",
    ),
    link: cn(
      "bg-transparent hover:bg-transparent",
      "underline-offset-4 hover:underline",
    ),
  }

  return (
    <HeroButton
      variant={variantMap[variant]}
      color={colorMap[variant]}
      size={sizeMap[size]}
      radius="full" // Soft Pop Glass: pill-shaped buttons
      className={cn(
        // Base motion for all variants
        "font-semibold",
        // Variant-specific glass styling
        glassStyles[variant],
        className
      )}
      {...props}
    >
      {children}
    </HeroButton>
  )
}
