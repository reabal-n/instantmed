"use client"

import * as React from "react"
import { Textarea as HeroTextarea, type TextAreaProps as HeroTextareaProps } from "@heroui/react"
import { cn } from "@/lib/utils"

export interface TextareaProps extends Omit<HeroTextareaProps, "size"> {
  size?: "default" | "sm" | "lg"
}

const sizeMap: Record<string, HeroTextareaProps["size"]> = {
  default: "md",
  sm: "sm",
  lg: "lg",
}

function Textarea({
  size = "default",
  className,
  ...props
}: TextareaProps) {
  return (
    <HeroTextarea
      size={sizeMap[size]}
      radius="lg" // Soft Pop Glass: rounded-xl for inputs
      variant="bordered"
      classNames={{
        base: "bg-transparent",
        mainWrapper: "bg-transparent",
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
          "min-h-[100px] md:min-h-0"
        ),
        innerWrapper: "bg-transparent",
        input: cn(
          "text-foreground placeholder:text-muted-foreground/50 bg-transparent",
          "text-base md:text-sm"
        ),
        helperWrapper: "bg-transparent",
        label: "text-foreground/80",
      }}
      className={className}
      {...props}
    />
  )
}

export { Textarea }
