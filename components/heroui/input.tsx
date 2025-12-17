"use client"

import * as React from "react"
import { Input as HeroInput, type InputProps as HeroInputProps } from "@heroui/react"

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
      radius="lg"
      variant="bordered"
      classNames={{
        inputWrapper: "bg-background/50 backdrop-blur-sm border-default-200 hover:border-primary data-[focused=true]:border-primary",
        input: "text-foreground placeholder:text-default-400",
      }}
      className={className}
      {...props}
    />
  )
}
