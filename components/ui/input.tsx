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
      radius="lg"
      variant="bordered"
      classNames={{
        base: cn("w-full", className),
        mainWrapper: "border-none shadow-none bg-transparent",
        inputWrapper: cn(
          "bg-white border border-slate-200 shadow-none",
          "transition-all duration-200",
          "hover:border-slate-300",
          "data-[focused=true]:border-primary data-[focused=true]:ring-1 data-[focused=true]:ring-primary/20",
          // Mobile optimizations
          "min-h-[48px] md:min-h-0",
          "text-base md:text-sm",
          classNames?.inputWrapper
        ),
        input: cn(
          "text-foreground placeholder:text-slate-400",
          "text-base md:text-sm",
          classNames?.input
        ),
        ...classNames,
      }}
      {...props}
    />
  )
}

export { Input }
