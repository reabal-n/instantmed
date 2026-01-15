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
          // Clean single-layer input styling
          "bg-white dark:bg-slate-900",
          "border border-slate-200 dark:border-slate-700",
          // Motion - gentle
          "transition-all duration-200",
          // Hover state
          "hover:border-slate-300 dark:hover:border-slate-600",
          // Focus state
          "data-[focused=true]:border-primary",
          "data-[focused=true]:ring-2 data-[focused=true]:ring-primary/20",
          // Mobile optimizations
          "min-h-[48px] md:min-h-0",
          "text-base md:text-sm",
          classNames?.inputWrapper
        ),
        input: cn(
          "text-foreground placeholder:text-muted-foreground/60",
          "text-base md:text-sm",
          "font-sans",
          classNames?.input
        ),
        label: "text-foreground/80 font-sans",
        ...classNames,
      }}
      {...props}
    />
  )
}

export { Input }
