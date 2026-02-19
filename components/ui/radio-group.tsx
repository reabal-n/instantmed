"use client"

import * as React from "react"
import * as RadioGroupPrimitive from "@radix-ui/react-radio-group"
import { Circle } from "lucide-react"
import { cn } from "@/lib/utils"

export interface RadioGroupProps extends React.ComponentProps<typeof RadioGroupPrimitive.Root> {
  className?: string
}

function RadioGroup({
  className,
  ...props
}: RadioGroupProps) {
  return (
    <RadioGroupPrimitive.Root
      className={cn("grid gap-3", className)}
      {...props}
    />
  )
}

function RadioGroupItem({
  className,
  value,
  children,
  ...props
}: React.ComponentProps<typeof RadioGroupPrimitive.Item> & { children?: React.ReactNode }) {
  return (
    <label className={cn("flex items-center gap-2 max-w-fit cursor-pointer", className)}>
      <RadioGroupPrimitive.Item
        value={value}
        className={cn(
          "aspect-square h-4 w-4 rounded-full border border-border",
          "ring-offset-background focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "data-[state=checked]:border-primary",
          "transition-colors duration-150"
        )}
        {...props}
      >
        <RadioGroupPrimitive.Indicator className="flex items-center justify-center">
          <Circle className="h-2.5 w-2.5 fill-primary text-primary" />
        </RadioGroupPrimitive.Indicator>
      </RadioGroupPrimitive.Item>
      {children && <span className="text-sm text-foreground">{children}</span>}
    </label>
  )
}

export { RadioGroup, RadioGroupItem }
