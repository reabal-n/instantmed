"use client"

import { forwardRef } from "react"
import { Button, ButtonProps } from "./button"
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

export interface LoadingButtonProps extends ButtonProps {
  loading?: boolean
  loadingText?: string
}

/**
 * Button with built-in loading state
 * 
 * Automatically disables and shows spinner when loading.
 * Maintains button width to prevent layout shift.
 */
export const LoadingButton = forwardRef<HTMLButtonElement, LoadingButtonProps>(
  ({ loading, loadingText, children, disabled, className, ...props }, ref) => {
    return (
      <Button
        ref={ref}
        disabled={loading || disabled}
        className={cn("relative", className)}
        {...props}
      >
        {loading && (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        )}
        <span className={cn(loading && !loadingText && "opacity-0")}>
          {children}
        </span>
        {loading && loadingText && (
          <span>{loadingText}</span>
        )}
        {loading && !loadingText && (
          <span className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="h-4 w-4 animate-spin" />
          </span>
        )}
      </Button>
    )
  }
)
LoadingButton.displayName = "LoadingButton"
