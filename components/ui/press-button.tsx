"use client"

import * as React from "react"
import { motion } from "framer-motion"
import { Button, type ButtonProps } from "@/components/ui/button"
import { cn } from "@/lib/utils"

/**
 * PressButton - Button with tactile press feedback
 * 
 * Provides visual feedback on press with scale animation
 * for improved UX micro-interactions.
 */
export const PressButton = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, children, disabled, ...props }, ref) => {
    return (
      <motion.div
        whileTap={disabled ? {} : { scale: 0.97 }}
        transition={{ type: "spring", stiffness: 400, damping: 17 }}
      >
        <Button
          ref={ref}
          className={cn(
            "transition-all duration-150",
            "active:brightness-95",
            className
          )}
          disabled={disabled}
          {...props}
        >
          {children}
        </Button>
      </motion.div>
    )
  }
)

PressButton.displayName = "PressButton"

/**
 * PressButtonPrimary - Primary action button with enhanced feedback
 */
export const PressButtonPrimary = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, children, disabled, ...props }, ref) => {
    return (
      <motion.div
        whileTap={disabled ? {} : { scale: 0.97 }}
        whileHover={disabled ? {} : { scale: 1.02 }}
        transition={{ type: "spring", stiffness: 400, damping: 17 }}
      >
        <Button
          ref={ref}
          className={cn(
            "transition-all duration-200",
            "hover:shadow-lg hover:shadow-primary/25",
            "active:shadow-md",
            className
          )}
          disabled={disabled}
          {...props}
        >
          {children}
        </Button>
      </motion.div>
    )
  }
)

PressButtonPrimary.displayName = "PressButtonPrimary"

/**
 * IconButton - Circular icon button with press feedback
 */
interface IconButtonProps extends Omit<ButtonProps, 'size'> {
  size?: "sm" | "md" | "lg"
}

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ className, children, disabled, size = "md", ...props }, ref) => {
    const sizeClasses = {
      sm: "w-8 h-8",
      md: "w-10 h-10",
      lg: "w-12 h-12",
    }

    return (
      <motion.div
        whileTap={disabled ? {} : { scale: 0.9 }}
        whileHover={disabled ? {} : { scale: 1.1 }}
        transition={{ type: "spring", stiffness: 400, damping: 17 }}
      >
        <Button
          ref={ref}
          variant="ghost"
          className={cn(
            "rounded-full p-0",
            sizeClasses[size],
            "transition-colors duration-150",
            className
          )}
          disabled={disabled}
          {...props}
        >
          {children}
        </Button>
      </motion.div>
    )
  }
)

IconButton.displayName = "IconButton"
