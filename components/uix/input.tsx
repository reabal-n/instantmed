"use client"

import * as React from "react"
import { Input as HeroInput, type InputProps as HeroInputProps } from "@heroui/react"
import { cn } from "@/lib/utils"

/**
 * UIX Input - HeroUI Pro primary with shadcn-compatible API
 * Premium input with enhanced focus states and soft radius
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
          "bg-background/60 backdrop-blur-sm",
          "border border-default-200/60",
          "hover:border-primary/50",
          "data-[focused=true]:border-primary",
          "data-[focused=true]:shadow-[0_0_0_3px_rgba(37,99,235,0.12)]",
          "transition-all duration-200 ease-out",
          "rounded-xl"
        ),
        input: cn(
          "text-foreground placeholder:text-default-400",
          "text-base"
        ),
        label: cn(
          "text-foreground/90 font-medium text-sm",
          "pb-1"
        ),
        description: "text-muted-foreground text-sm mt-1",
        errorMessage: "text-danger text-sm mt-1",
        helperWrapper: "p-0",
      }}
      className={cn(className)}
      {...props}
    />
  )
}

export { Input as UIXInput }
