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
  classNames,
  ...props
}: InputProps & { classNames?: HeroInputProps["classNames"] }) {
  return (
    <HeroInput
      size={sizeMap[size]}
      radius="lg" // Soft Pop Glass: rounded-xl for inputs
      variant="bordered"
      classNames={{
        base: cn("w-full", className),
        mainWrapper: "border-none shadow-none bg-transparent",
        inputWrapper: cn(
          // Soft Pop Glass surface
          "bg-white/60 dark:bg-gray-900/40",
          "backdrop-blur-lg",
          "border border-white/30 dark:border-white/10",
          // Motion
          "transition-all duration-200",
          // Hover state
          "hover:border-primary/30",
          "hover:bg-white/70 dark:hover:bg-gray-900/50",
          // Focus state with glow
          "data-[focused=true]:border-primary/50",
          "data-[focused=true]:bg-white/80 dark:data-[focused=true]:bg-gray-900/60",
          "data-[focused=true]:shadow-[0_0_20px_rgba(59,130,246,0.15)]",
          // Mobile optimizations
          "min-h-[48px] md:min-h-0",
          "text-base md:text-sm",
          classNames?.inputWrapper
        ),
        input: cn(
          "text-foreground placeholder:text-muted-foreground/50",
          "text-base md:text-sm",
          classNames?.input
        ),
        label: "text-foreground/80",
        ...classNames,
      }}
      {...props}
    />
  )
}

export { Input }
