"use client"

import * as React from "react"
import { Textarea as HeroTextarea, type TextAreaProps as HeroTextareaProps } from "@heroui/react"
import { cn } from "@/lib/utils"

export interface TextareaProps extends Omit<HeroTextareaProps, "size" | "onChange" | "onValueChange"> {
  size?: "default" | "sm" | "lg"
  onChange?: React.ChangeEventHandler<HTMLTextAreaElement | HTMLInputElement>
  /** Preferred callback — receives the string value directly, avoiding HeroUI's event type mismatch */
  onValueChange?: (value: string) => void
}

const sizeMap: Record<string, HeroTextareaProps["size"]> = {
  default: "md",
  sm: "sm",
  lg: "lg",
}

function Textarea({
  size = "default",
  className,
  onChange,
  onValueChange,
  ...props
}: TextareaProps) {
  return (
    <HeroTextarea
      size={sizeMap[size]}
      // Bridge onChange safely — HeroUI fires ChangeEvent<HTMLInputElement> but consumers
      // may expect HTMLTextAreaElement. The cast is safe because only .value is read.
      onChange={onChange as HeroTextareaProps["onChange"]}
      onValueChange={onValueChange}
      radius="md" // Craft: restrained radius
      variant="bordered"
      classNames={{
        base: "bg-transparent overflow-visible",
        mainWrapper: "bg-transparent overflow-visible",
        inputWrapper: cn(
          // Clean surface - no backdrop-blur
          "!bg-white dark:!bg-slate-900",
          "!border !border-border",
          // Stable min-height - never reset to 0
          "min-h-[100px]",
          // Motion
          "transition-all duration-200",
          // Hover state
          "hover:!border-slate-300 dark:hover:!border-slate-600",
          // Focus state - clean ring
          "data-[focused=true]:!border-primary",
          "data-[focused=true]:!ring-2 data-[focused=true]:!ring-primary/20"
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
