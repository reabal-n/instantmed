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
      radius="lg"
      variant="bordered"
      classNames={{
        base: "bg-transparent",
        mainWrapper: "bg-transparent",
        inputWrapper: cn(
          "bg-white border border-slate-200 shadow-none",
          "transition-all duration-200",
          "hover:border-slate-300",
          "data-[focused=true]:border-primary data-[focused=true]:ring-1 data-[focused=true]:ring-primary/20",
          // Mobile optimizations
          "min-h-[48px] md:min-h-0"
        ),
        innerWrapper: "bg-transparent",
        input: cn(
          "text-foreground placeholder:text-slate-400 bg-transparent",
          "text-base md:text-sm"
        ),
        helperWrapper: "bg-transparent",
      }}
      className={className}
      {...props}
    />
  )
}

export { Textarea }
