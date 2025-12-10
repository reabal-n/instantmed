import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { Loader2 } from "lucide-react"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive active:scale-[0.98]",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm hover:shadow-md",
        destructive:
          "bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60 shadow-sm",
        outline:
          "border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80 shadow-sm",
        ghost: "hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50",
        link: "text-primary underline-offset-4 hover:underline",
        premium:
          "bg-gradient-to-r from-[#00E2B5] to-[#00C9A0] text-[#0A0F1C] font-semibold hover:shadow-lg hover:shadow-[#00E2B5]/25 hover:-translate-y-0.5",
        success: "bg-green-500 text-white hover:bg-green-600 shadow-sm",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        sm: "h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5 text-xs",
        lg: "h-11 rounded-md px-6 has-[>svg]:px-4 text-base",
        xl: "h-12 rounded-lg px-8 has-[>svg]:px-6 text-base",
        icon: "size-9",
        "icon-sm": "size-8",
        "icon-lg": "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ComponentProps<"button">,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  isLoading?: boolean
  loadingText?: string
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      asChild = false,
      isLoading = false,
      loadingText,
      leftIcon,
      rightIcon,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : "button"

    // If loading, show loading state
    if (isLoading) {
      return (
        <button
          ref={ref}
          data-slot="button"
          className={cn(buttonVariants({ variant, size, className }), "relative")}
          disabled
          {...props}
        >
          <span className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="h-4 w-4 animate-spin" />
          </span>
          <span className="invisible flex items-center gap-2">
            {leftIcon}
            {loadingText || children}
            {rightIcon}
          </span>
        </button>
      )
    }

    // If using asChild, render as Slot
    if (asChild) {
      return (
        <Comp
          ref={ref}
          data-slot="button"
          className={cn(buttonVariants({ variant, size, className }))}
          {...props}
        >
          {children}
        </Comp>
      )
    }

    // Normal button render
    return (
      <button
        ref={ref}
        data-slot="button"
        className={cn(buttonVariants({ variant, size, className }))}
        disabled={disabled}
        {...props}
      >
        {leftIcon && <span className="shrink-0">{leftIcon}</span>}
        {children}
        {rightIcon && <span className="shrink-0">{rightIcon}</span>}
      </button>
    )
  }
)
Button.displayName = "Button"

// Button group component
interface ButtonGroupProps {
  children: React.ReactNode
  className?: string
  orientation?: "horizontal" | "vertical"
}

function ButtonGroup({ children, className, orientation = "horizontal" }: ButtonGroupProps) {
  return (
    <div
      className={cn(
        "inline-flex",
        orientation === "horizontal"
          ? "[&>button]:rounded-none [&>button:first-child]:rounded-l-md [&>button:last-child]:rounded-r-md [&>button:not(:last-child)]:border-r-0"
          : "flex-col [&>button]:rounded-none [&>button:first-child]:rounded-t-md [&>button:last-child]:rounded-b-md [&>button:not(:last-child)]:border-b-0",
        className
      )}
    >
      {children}
    </div>
  )
}

export { Button, ButtonGroup, buttonVariants }
