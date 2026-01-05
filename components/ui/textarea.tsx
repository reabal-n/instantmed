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
        inputWrapper: cn(
          "bg-background/50 backdrop-blur-sm border-default-200",
          "transition-all duration-300",
          "hover:border-primary/50 hover:shadow-sm hover:shadow-primary/5",
          "data-[focused=true]:border-primary data-[focused=true]:shadow-md data-[focused=true]:shadow-primary/10",
          "data-[focused=true]:ring-2 data-[focused=true]:ring-primary/20"
        ),
        input: "text-foreground placeholder:text-default-400",
      }}
      className={className}
      {...props}
    />
  )
}

export { Textarea }
