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
        base: "bg-transparent overflow-visible",
        mainWrapper: "bg-transparent overflow-visible",
        inputWrapper: cn(
          // Single border from variant="bordered" - no duplicate border class
          "bg-white/60 dark:bg-slate-900/40",
          "backdrop-blur-lg",
          // Stable min-height - never reset to 0
          "min-h-[100px]",
          // Motion
          "transition-all duration-200",
          // Hover state
          "hover:border-primary/30",
          "hover:bg-white/70 dark:hover:bg-slate-900/50",
          // Focus state - border color only, no glow (single visual boundary)
          "data-[focused=true]:border-primary",
          "data-[focused=true]:bg-white/80 dark:data-[focused=true]:bg-slate-900/60"
        ),
        innerWrapper: "bg-transparent",
        input: cn(
          "text-foreground placeholder:text-muted-foreground/50 bg-transparent",
          "text-base md:text-sm",
          // Ensure textarea content area has stable height
          "min-h-[80px]",
          // Override global textarea styles from globals.css
          "!border-none !shadow-none !p-0 !rounded-none"
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
