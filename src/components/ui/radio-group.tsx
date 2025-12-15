"use client"

import * as React from "react"
import * as RadioGroupPrimitive from "@radix-ui/react-radio-group"

import { cn } from "@/lib/utils"

function RadioGroup({
  className,
  ...props
}: React.ComponentProps<typeof RadioGroupPrimitive.Root>) {
  return (
    <RadioGroupPrimitive.Root
      data-slot="radio-group"
      className={cn("grid gap-3", className)}
      {...props}
    />
  )
}

function RadioGroupItem({
  className,
  ...props
}: React.ComponentProps<typeof RadioGroupPrimitive.Item>) {
  return (
    <RadioGroupPrimitive.Item
      data-slot="radio-group-item"
      className={cn(
        // Base styles
        "peer aspect-square size-5 shrink-0 rounded-full",
        // Glassy background
        "bg-background/50 backdrop-blur-sm",
        "dark:bg-surface/50",
        // Border
        "border border-border",
        "dark:border-border/50",
        // Shadow
        "shadow-[0_1px_2px_rgba(0,0,0,0.05)]",
        "dark:shadow-[0_1px_2px_rgba(0,0,0,0.2)]",
        // Transitions
        "transition-all duration-200 ease-out",
        // Hover (unchecked)
        "hover:border-primary/50",
        "hover:shadow-[0_0_0_3px_var(--primary)/0.08]",
        "dark:hover:border-primary/40",
        // Focus ring (accessible)
        "outline-none",
        "focus-visible:border-primary",
        "focus-visible:ring-2 focus-visible:ring-primary/20",
        "focus-visible:shadow-[0_0_0_4px_var(--primary)/0.1]",
        "dark:focus-visible:ring-primary/30",
        // Checked state
        "data-[state=checked]:border-primary",
        "data-[state=checked]:shadow-[0_1px_2px_rgba(0,0,0,0.1),0_0_0_1px_var(--primary)/0.2]",
        "data-[state=checked]:hover:shadow-[0_2px_4px_rgba(0,0,0,0.15),0_0_8px_var(--primary)/0.2]",
        "dark:data-[state=checked]:shadow-[0_1px_2px_rgba(0,0,0,0.3),0_0_8px_var(--primary)/0.15]",
        // Error state
        "aria-invalid:border-destructive",
        "aria-invalid:ring-2 aria-invalid:ring-destructive/20",
        "dark:aria-invalid:ring-destructive/30",
        // Disabled
        "disabled:cursor-not-allowed disabled:opacity-50",
        "disabled:bg-muted disabled:border-muted",
        className
      )}
      {...props}
    >
      <RadioGroupPrimitive.Indicator
        data-slot="radio-group-indicator"
        className="relative flex items-center justify-center"
      >
        {/* Inner dot with glow */}
        <span
          className={cn(
            "absolute size-2.5 rounded-full",
            "bg-primary",
            "shadow-[0_0_6px_var(--primary)/0.4]",
            // Animation
            "animate-in zoom-in-50 duration-150"
          )}
        />
      </RadioGroupPrimitive.Indicator>
    </RadioGroupPrimitive.Item>
  )
}

export { RadioGroup, RadioGroupItem }
