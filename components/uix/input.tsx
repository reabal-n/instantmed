"use client"

import * as React from "react"
import { Input as HeroInput, type InputProps as HeroInputProps } from "@heroui/react"
import { cn } from "@/lib/utils"

/**
 * UIX Input - HeroUI Pro primary with shadcn-compatible API
 * Modernized input with enhanced focus states
 */

export interface InputProps extends Omit<HeroInputProps, "size"> {
  size?: "default" | "sm" | "lg"
}

const sizeMap: Record<string, HeroInputProps["size"]> = {
  default: "md",
  sm: "sm",
  lg: "lg",
}

export function Input({
  size = "default",
  className,
  ...props
}: InputProps) {
  return (
    <HeroInput
      size={sizeMap[size]}
      radius="lg"
      variant="bordered"
      classNames={{
        inputWrapper: cn(
          "bg-background/50 backdrop-blur-sm",
          "border-default-200 hover:border-primary",
          "data-[focused=true]:border-primary data-[focused=true]:ring-2 data-[focused=true]:ring-primary/20",
          "transition-all duration-200"
        ),
        input: "text-foreground placeholder:text-default-400",
        label: "text-foreground font-medium",
        errorMessage: "text-danger text-sm",
      }}
      className={cn(className)}
      {...props}
    />
  )
}

export { Input as UIXInput }
