"use client"

import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

/**
 * UIX Button - Radix/Tailwind with shadcn-compatible API
 * Premium, modern styling with soft radius
 */

const uixButtonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2",
    "font-medium whitespace-nowrap select-none",
    "transition-all duration-200 ease-out",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2",
    "disabled:pointer-events-none disabled:opacity-50",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0",
    "hover:-translate-y-0.5 active:scale-[0.98]",
  ],
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-md hover:shadow-lg hover:bg-primary/90",
        destructive:
          "bg-destructive text-destructive-foreground shadow-md hover:shadow-lg hover:bg-destructive/90",
        outline:
          "border border-input bg-background text-foreground hover:bg-accent hover:text-accent-foreground",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost:
          "text-foreground shadow-none hover:shadow-sm hover:bg-accent hover:text-accent-foreground",
        link:
          "text-primary underline-offset-4 hover:underline shadow-none hover:shadow-none",
      },
      size: {
        default: "h-10 px-4 py-2 text-sm rounded-lg",
        sm: "h-9 px-3 text-xs rounded-lg",
        lg: "h-11 px-8 text-base rounded-lg",
        icon: "h-10 w-10 rounded-lg",
        "icon-sm": "h-9 w-9 rounded-lg",
        "icon-lg": "h-11 w-11 rounded-lg",
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
    VariantProps<typeof uixButtonVariants> {
  asChild?: boolean
  className?: string
  children?: React.ReactNode
  /** Use pill shape (full rounded) for CTA buttons */
  pill?: boolean
}

export function Button({
  variant,
  size,
  asChild = false,
  className,
  children,
  pill = false,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      type={asChild ? undefined : (props.type ?? "button")}
      className={cn(
        uixButtonVariants({ variant, size }),
        pill && "!rounded-full",
        className
      )}
      {...props}
    >
      {children}
    </Comp>
  )
}

export { Button as UIXButton }
