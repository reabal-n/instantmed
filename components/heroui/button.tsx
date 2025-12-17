"use client"

import * as React from "react"
import { Button as HeroButton, type ButtonProps as HeroButtonProps } from "@heroui/react"
import { Slot } from "@radix-ui/react-slot"

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

  return (
    <HeroButton
      variant={variantMap[variant]}
      color={colorMap[variant]}
      size={sizeMap[size]}
      radius="lg"
      className={className}
      {...props}
    >
      {children}
    </HeroButton>
  )
}
