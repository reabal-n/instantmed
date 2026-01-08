"use client"

import * as React from "react"
import { Input as HeroInput, type InputProps as HeroInputProps } from "@heroui/react"
import { cn } from "@/lib/utils"

export interface InputProps extends Omit<HeroInputProps, "size"> {
  size?: "default" | "sm" | "lg"
}

const sizeMap: Record<string, HeroInputProps["size"]> = {
  default: "md",
  sm: "sm",
  lg: "lg",
}

function Input({
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
        base: cn("w-full", className),
        mainWrapper: "border-none shadow-none bg-transparent", // Remove borders from outer wrapper
        inputWrapper: cn(
          "bg-background/50 backdrop-blur-sm",
          "border-default-200",
          "transition-all duration-200 ease-out",
          "hover:border-primary/50 hover:shadow-[0_2px_6px_rgba(37,99,235,0.08)] hover:shadow-primary/5",
          "data-[focused=true]:border-primary data-[focused=true]:shadow-[0_4px_12px_rgba(37,99,235,0.12)] data-[focused=true]:shadow-primary/10",
          "data-[focused=true]:ring-2 data-[focused=true]:ring-primary/20",
          "data-[focused=true]:scale-[1.01]", // Subtle scale on focus
          "hover:scale-[1.005]", // Subtle scale on hover
          // Mobile optimizations
          "min-h-[48px] md:min-h-0", // Larger touch target on mobile
          "text-base md:text-sm" // Prevent zoom on iOS (16px minimum)
        ),
        input: cn(
          "text-foreground placeholder:text-default-400",
          "text-base md:text-sm" // Prevent zoom on iOS
        ),
      }}
      {...props}
    />
  )
}

export { Input }
