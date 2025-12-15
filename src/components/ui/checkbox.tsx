"use client"

import * as React from "react"
import * as CheckboxPrimitive from "@radix-ui/react-checkbox"
import { CheckIcon } from "lucide-react"

import { cn } from "@/lib/utils"

function Checkbox({
  className,
  ...props
}: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        // Base styles
        "peer size-5 shrink-0 rounded-md",
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
        "data-[state=checked]:bg-primary",
        "data-[state=checked]:border-primary",
        "data-[state=checked]:text-primary-foreground",
        "data-[state=checked]:shadow-[0_1px_2px_rgba(0,0,0,0.1),0_0_0_1px_var(--primary)/0.2]",
        "data-[state=checked]:hover:bg-primary/90",
        "data-[state=checked]:hover:shadow-[0_2px_4px_rgba(0,0,0,0.15),0_0_8px_var(--primary)/0.2]",
        "dark:data-[state=checked]:shadow-[0_1px_2px_rgba(0,0,0,0.3),0_0_8px_var(--primary)/0.15]",
        // Indeterminate state
        "data-[state=indeterminate]:bg-primary",
        "data-[state=indeterminate]:border-primary",
        "data-[state=indeterminate]:text-primary-foreground",
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
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className={cn(
          "flex items-center justify-center text-current",
          // Animation
          "data-[state=checked]:animate-in data-[state=checked]:zoom-in-75",
          "data-[state=unchecked]:animate-out data-[state=unchecked]:zoom-out-75",
          "duration-150"
        )}
      >
        <CheckIcon className="size-3.5 stroke-[3]" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}

export { Checkbox }
