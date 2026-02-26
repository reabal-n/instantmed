"use client"

import * as React from "react"
import * as CheckboxPrimitive from "@radix-ui/react-checkbox"
import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

export interface CheckboxProps extends Omit<React.ComponentProps<typeof CheckboxPrimitive.Root>, "checked" | "onCheckedChange"> {
  // Support shadcn/ui API
  checked?: boolean
  onCheckedChange?: (checked: boolean) => void
  // Legacy API compatibility
  isSelected?: boolean
  onValueChange?: (isSelected: boolean) => void
  children?: React.ReactNode
}

function Checkbox({
  className,
  checked,
  onCheckedChange,
  isSelected,
  onValueChange,
  children,
  ...props
}: CheckboxProps) {
  const resolvedChecked = isSelected ?? checked
  const resolvedOnChange = onValueChange ?? onCheckedChange

  return (
    <label className={cn("flex items-center gap-2 max-w-fit cursor-pointer", className)}>
      <CheckboxPrimitive.Root
        checked={resolvedChecked}
        onCheckedChange={(val) => resolvedOnChange?.(val === true)}
        className={cn(
          "peer h-4 w-4 shrink-0 rounded-md border border-border",
          "ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "data-[state=checked]:bg-primary data-[state=checked]:border-primary data-[state=checked]:text-primary-foreground",
          "transition-colors duration-150"
        )}
        {...props}
      >
        <CheckboxPrimitive.Indicator className="flex items-center justify-center">
          <Check className="h-3 w-3" />
        </CheckboxPrimitive.Indicator>
      </CheckboxPrimitive.Root>
      {children && <span className="text-sm text-foreground">{children}</span>}
    </label>
  )
}

export { Checkbox }
