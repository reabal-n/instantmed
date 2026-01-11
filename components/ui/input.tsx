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
          // Lumen Glass surface
          "bg-white/65 dark:bg-slate-900/40",
          "backdrop-blur-lg",
          "border border-sky-300/30 dark:border-white/10",
          // Motion - gentle
          "transition-all duration-300",
          // Hover state
          "hover:border-sky-300/50",
          "hover:bg-white/75 dark:hover:bg-slate-900/50",
          // Focus state with dawn glow
          "data-[focused=true]:border-dawn-300/60",
          "data-[focused=true]:bg-white/85 dark:data-[focused=true]:bg-slate-900/60",
          "data-[focused=true]:shadow-[0_0_20px_rgba(245,169,98,0.15)]",
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
