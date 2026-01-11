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

export function Input({
  size = "default",
  className,
  ...props
}: InputProps) {
  return (
    <HeroInput
      size={sizeMap[size]}
      radius="lg" // Soft Pop Glass: rounded-xl for inputs
      variant="bordered"
      classNames={{
        // Soft Pop Glass input styling
        inputWrapper: cn(
          // Glass surface
          "bg-white/60 dark:bg-slate-900/40",
          "backdrop-blur-lg",
          "border border-white/30 dark:border-white/10",
          // Focus state with glow
          "hover:border-primary/30",
          "data-[focused=true]:border-primary/50",
          "data-[focused=true]:bg-white/80 dark:data-[focused=true]:bg-slate-900/60",
          "data-[focused=true]:shadow-[0_0_20px_rgba(59,130,246,0.15)]",
          // Motion
          "transition-all duration-200",
        ),
        input: cn(
          "text-foreground",
          "placeholder:text-muted-foreground/50",
        ),
        label: "text-foreground/80",
      }}
      className={className}
      {...props}
    />
  )
}
