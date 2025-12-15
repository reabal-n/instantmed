import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  [
    // Base styles
    "inline-flex items-center justify-center gap-2 whitespace-nowrap",
    "rounded-lg text-sm font-medium",
    "shrink-0 select-none",
    // Transitions
    "transition-all duration-200 ease-out",
    // Icon handling
    "[&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 [&_svg]:shrink-0",
    // Disabled state
    "disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed",
    "disabled:shadow-none disabled:bg-muted disabled:text-muted-foreground",
    // Focus ring (accessible)
    "outline-none",
    "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
    // Error state
    "aria-invalid:ring-2 aria-invalid:ring-destructive/30 aria-invalid:border-destructive",
  ],
  {
    variants: {
      variant: {
        default: [
          // Base gradient
          "bg-gradient-to-b from-primary to-primary/90",
          "text-primary-foreground",
          "border border-primary/20",
          "shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1),0_1px_2px_rgba(0,0,0,0.1)]",
          // Hover
          "hover:from-primary/95 hover:to-primary/85",
          "hover:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.15),0_4px_12px_rgba(0,0,0,0.15),0_0_0_1px_var(--primary)/0.1]",
          "hover:border-primary/30",
          // Active/pressed
          "active:scale-[0.98] active:shadow-[inset_0_2px_4px_rgba(0,0,0,0.2)]",
          "active:from-primary/90 active:to-primary/80",
        ],
        destructive: [
          // Base gradient
          "bg-gradient-to-b from-destructive to-destructive/90",
          "text-white",
          "border border-destructive/20",
          "shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1),0_1px_2px_rgba(0,0,0,0.1)]",
          // Hover
          "hover:from-destructive/95 hover:to-destructive/85",
          "hover:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.15),0_4px_12px_rgba(0,0,0,0.15),0_0_0_1px_var(--destructive)/0.2]",
          // Active/pressed
          "active:scale-[0.98] active:shadow-[inset_0_2px_4px_rgba(0,0,0,0.2)]",
          // Focus
          "focus-visible:ring-destructive/30",
          // Dark mode
          "dark:from-destructive/80 dark:to-destructive/70",
        ],
        outline: [
          // Base
          "bg-background/50 backdrop-blur-sm",
          "text-foreground",
          "border border-border",
          "shadow-[0_1px_2px_rgba(0,0,0,0.05)]",
          // Hover
          "hover:bg-accent/50 hover:text-accent-foreground",
          "hover:border-primary/30",
          "hover:shadow-[0_2px_8px_rgba(0,0,0,0.08),0_0_0_1px_var(--primary)/0.1]",
          // Active/pressed
          "active:scale-[0.98] active:bg-accent/70",
          // Dark mode
          "dark:bg-surface/50 dark:border-border",
          "dark:hover:bg-surface-elevated/50 dark:hover:border-primary/20",
        ],
        secondary: [
          // Base
          "bg-gradient-to-b from-secondary to-secondary/90",
          "text-secondary-foreground",
          "border border-border/50",
          "shadow-[inset_0_1px_0_0_rgba(255,255,255,0.5),0_1px_2px_rgba(0,0,0,0.05)]",
          // Hover
          "hover:from-secondary/95 hover:to-secondary/85",
          "hover:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.6),0_2px_8px_rgba(0,0,0,0.08)]",
          "hover:border-border",
          // Active/pressed
          "active:scale-[0.98] active:shadow-[inset_0_1px_2px_rgba(0,0,0,0.1)]",
          // Dark mode
          "dark:from-surface-elevated dark:to-surface",
          "dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05),0_1px_2px_rgba(0,0,0,0.2)]",
          "dark:hover:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08),0_4px_12px_rgba(0,0,0,0.25)]",
        ],
        ghost: [
          // Base
          "bg-transparent",
          "text-foreground",
          "border border-transparent",
          // Hover
          "hover:bg-accent/50 hover:text-accent-foreground",
          "hover:border-border/50",
          // Active/pressed
          "active:scale-[0.98] active:bg-accent/70",
          // Dark mode
          "dark:hover:bg-surface-elevated/50",
        ],
        link: [
          "text-primary underline-offset-4",
          "hover:underline hover:text-primary/80",
          "active:text-primary/70",
        ],
      },
      size: {
        default: "h-10 px-4 py-2 has-[>svg]:px-3",
        sm: "h-8 rounded-md gap-1.5 px-3 text-xs has-[>svg]:px-2.5",
        lg: "h-11 rounded-lg px-6 text-base has-[>svg]:px-4",
        xl: "h-12 rounded-xl px-8 text-base has-[>svg]:px-5",
        icon: "size-10 rounded-lg",
        "icon-sm": "size-8 rounded-md",
        "icon-lg": "size-11 rounded-lg",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
