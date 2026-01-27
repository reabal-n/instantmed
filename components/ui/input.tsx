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
  startContent,
  endContent,
  ...props
}: InputProps & { classNames?: HeroInputProps["classNames"] }) {
  return (
    <HeroInput
      size={sizeMap[size]}
      radius="lg"
      variant="flat"
      startContent={startContent}
      endContent={endContent}
      classNames={{
        base: cn("w-full", className),
        mainWrapper: "!shadow-none !bg-transparent",
        inputWrapper: cn(
          // Single-layer input styling - clean border, no duplicates
          "!bg-white dark:!bg-slate-900",
          "!border !border-slate-200 dark:!border-slate-700",
          "!shadow-none !outline-none",
          "!rounded-md",
          // Remove HeroUI's default pseudo-element borders
          "before:!hidden after:!hidden",
          // Transition
          "transition-all duration-200",
          // Hover
          "hover:!border-slate-300 dark:hover:!border-slate-600",
          // Focus - border color AND ring for accessibility
          "data-[focused=true]:!border-primary",
          "data-[focused=true]:!ring-2 data-[focused=true]:!ring-primary/20",
          // Mobile touch target
          "min-h-[48px] md:min-h-0",
          classNames?.inputWrapper
        ),
        innerWrapper: cn(
          "!bg-transparent",
          // Ensure icons align properly
          startContent && "gap-2",
          endContent && "gap-2"
        ),
        input: cn(
          "!bg-transparent",
          "text-foreground placeholder:text-muted-foreground/80",
          "text-base md:text-sm",
          "font-sans",
          // Override global input styles from globals.css
          "!border-none !shadow-none !p-0 !rounded-none",
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
