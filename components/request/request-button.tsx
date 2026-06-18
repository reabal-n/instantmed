"use client"

import * as React from "react"

import { requestCx } from "./request-cx"

type RequestButtonVariant = "default" | "outline" | "secondary" | "ghost"
type RequestButtonSize = "default" | "sm" | "lg" | "icon"

const variantClasses: Record<RequestButtonVariant, string> = {
  default: "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 hover:shadow-md",
  outline: "border border-input bg-white text-foreground hover:bg-muted/50 dark:bg-card",
  secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
  ghost: "text-foreground hover:bg-muted/50 hover:text-accent-foreground",
}

const sizeClasses: Record<RequestButtonSize, string> = {
  default: "h-11 px-4 py-2 text-sm",
  sm: "h-9 px-3 text-xs",
  lg: "h-12 px-8 text-base",
  icon: "h-11 w-11",
}

export interface RequestButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: RequestButtonVariant
  size?: RequestButtonSize
  isLoading?: boolean
}

export const RequestButton = React.forwardRef<HTMLButtonElement, RequestButtonProps>(
  (
    {
      variant = "default",
      size = "default",
      className,
      children,
      disabled,
      isLoading,
      type = "button",
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || isLoading

    return (
      <button
        ref={ref}
        type={type}
        disabled={isDisabled}
        aria-busy={isLoading || undefined}
        aria-disabled={isDisabled || undefined}
        className={requestCx(
          "inline-flex items-center justify-center gap-2 rounded-md font-sans font-semibold",
          "origin-center select-none whitespace-nowrap",
          "transition-[transform,box-shadow,background-color,border-color,color,opacity] duration-200",
          "active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dawn-300 focus-visible:ring-offset-2",
          "disabled:pointer-events-none disabled:opacity-50",
          "[&_svg]:pointer-events-none [&_svg]:shrink-0",
          variantClasses[variant],
          sizeClasses[size],
          className
        )}
        {...props}
      >
        {isLoading ? (
          <>
            <span
              className="-ml-1 mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
              aria-hidden="true"
            />
            {children}
          </>
        ) : (
          children
        )}
      </button>
    )
  }
)

RequestButton.displayName = "RequestButton"
