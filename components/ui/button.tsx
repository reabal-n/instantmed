"use client"

import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import * as React from "react"

import { INTAKE_PRIMARY_ACTION_CHANGE_EVENT } from "@/components/request/request-button"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2",
    "font-sans font-semibold",
    "rounded-md",
    "select-none",
    "origin-center",
    "whitespace-nowrap max-[240px]:h-auto max-[240px]:min-h-11 max-[240px]:whitespace-normal max-[240px]:px-3 max-[240px]:py-2 max-[240px]:text-center",
    "transition-[transform,box-shadow,background-color,border-color,color,opacity] duration-200",
    "active:scale-[0.97]",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dawn-300 dark:focus-visible:ring-dawn-500/40 focus-visible:ring-offset-2",
    "disabled:pointer-events-none disabled:opacity-50",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0",
  ],
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-sm hover:shadow-md hover:bg-primary/90",
        destructive:
          "bg-destructive text-destructive-foreground shadow-sm hover:shadow-md hover:bg-destructive/90",
        outline:
          "border border-input bg-white dark:bg-card text-foreground border-border hover:bg-muted/50",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost:
          "text-foreground hover:bg-muted/50 hover:text-accent-foreground",
        link:
          "bg-transparent text-primary underline-offset-4 hover:underline hover:text-primary/80",
      },
      size: {
        default: "h-11 px-4 py-2 text-sm",
        sm: "h-9 px-3 text-xs",
        lg: "h-12 px-8 text-base",
        icon: "h-11 w-11",
        "icon-sm": "h-9 w-9",
        "icon-lg": "h-12 w-12",
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
  /** Show loading spinner and disable interaction */
  isLoading?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant,
      size,
      asChild = false,
      className,
      children,
      disabled,
      isLoading,
      type = "button",
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : "button"
    const isDisabled = disabled || isLoading

    // The intake flow's mobile sticky CTA mirrors whichever button carries
    // data-intake-primary-action="true" (request-flow.tsx syncs once per step
    // change and then relies on this announce event). Most steps render that
    // button with this shared Button, and steps are lazy-loaded, so a
    // mount-time-only sync misses them — the announce must fire from here on
    // mount, unmount, and every label/ready/disabled change.
    const primaryActionFlag = (props as Record<string, unknown>)["data-intake-primary-action"]
    const primaryActionLabel = (props as Record<string, unknown>)["data-intake-primary-label"]
    const primaryActionReady = (props as Record<string, unknown>)["data-intake-primary-ready"]

    React.useEffect(() => {
      if (primaryActionFlag !== "true" || typeof window === "undefined") return
      window.dispatchEvent(new Event(INTAKE_PRIMARY_ACTION_CHANGE_EVENT))
      return () => {
        window.dispatchEvent(new Event(INTAKE_PRIMARY_ACTION_CHANGE_EVENT))
      }
    }, [primaryActionFlag, primaryActionLabel, primaryActionReady, isDisabled])

    return (
      <Comp
        ref={ref}
        type={asChild ? undefined : type}
        disabled={isDisabled}
        aria-busy={isLoading || undefined}
        aria-disabled={isDisabled || undefined}
        className={cn(buttonVariants({ variant, size, className }))}
        {...props}
      >
        {isLoading ? (
          <>
            <svg
              className="animate-spin -ml-1 mr-2 h-4 w-4"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            {children}
          </>
        ) : (
          children
        )}
      </Comp>
    )
  }
)

Button.displayName = "Button"

export { Button, buttonVariants }
