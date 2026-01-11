"use client"

import * as React from "react"
import { motion, type HTMLMotionProps } from "framer-motion"
import { cn } from "@/lib/utils"
import { lumenDurations, lumenEasing } from "@/components/ui/motion"

export interface LumenButtonProps extends Omit<HTMLMotionProps<"button">, "children"> {
  children: React.ReactNode
  /** Button variant */
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger"
  /** Button size */
  size?: "sm" | "md" | "lg"
  /** Full width button */
  fullWidth?: boolean
  /** Loading state */
  isLoading?: boolean
  /** Disabled state */
  disabled?: boolean
  /** Icon on the left */
  leftIcon?: React.ReactNode
  /** Icon on the right */
  rightIcon?: React.ReactNode
}

const variantStyles = {
  primary: cn(
    // Dawn warmth - primary action
    "bg-dawn-500 text-white",
    "shadow-[0_4px_20px_rgba(245,169,98,0.25)]",
    "hover:bg-dawn-600",
    "hover:shadow-[0_8px_30px_rgba(245,169,98,0.30)]",
  ),
  secondary: cn(
    // Sky cool - secondary action
    "bg-sky-200 text-foreground",
    "shadow-[0_4px_20px_rgba(197,221,240,0.15)]",
    "hover:bg-sky-300",
    "hover:shadow-[0_8px_30px_rgba(197,221,240,0.20)]",
  ),
  outline: cn(
    // Glass outline
    "bg-white/75 text-foreground",
    "border border-sky-300/40",
    "backdrop-blur-xl",
    "shadow-[0_4px_20px_rgba(197,221,240,0.10)]",
    "hover:bg-white/85",
    "hover:border-sky-300/60",
    "hover:shadow-[0_8px_30px_rgba(197,221,240,0.15)]",
  ),
  ghost: cn(
    // Transparent
    "bg-transparent text-foreground",
    "hover:bg-dawn-50",
  ),
  danger: cn(
    // Soft error
    "bg-[#E07A7A] text-white",
    "shadow-[0_4px_20px_rgba(224,122,122,0.20)]",
    "hover:bg-[#D06666]",
    "hover:shadow-[0_8px_30px_rgba(224,122,122,0.25)]",
  ),
}

const sizeStyles = {
  sm: "px-4 py-2 text-sm min-h-[36px]",
  md: "px-6 py-3 text-base min-h-[44px]",
  lg: "px-8 py-4 text-lg min-h-[52px]",
}

export function LumenButton({
  children,
  variant = "primary",
  size = "md",
  fullWidth = false,
  isLoading = false,
  disabled = false,
  leftIcon,
  rightIcon,
  className,
  ...props
}: LumenButtonProps) {
  const isDisabled = disabled || isLoading

  return (
    <motion.button
      className={cn(
        // Base styles
        "relative inline-flex items-center justify-center gap-2",
        "font-sans font-semibold",
        "rounded-xl",
        "select-none",
        "transition-colors duration-300",
        // Focus styles
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dawn-300 focus-visible:ring-offset-2",
        // Variant and size
        variantStyles[variant],
        sizeStyles[size],
        // Full width
        fullWidth && "w-full",
        // Disabled
        isDisabled && "opacity-60 cursor-not-allowed",
        className
      )}
      disabled={isDisabled}
      whileHover={!isDisabled ? {
        y: -2,
        transition: {
          duration: lumenDurations.normal,
          ease: lumenEasing.gentle,
        },
      } : undefined}
      whileTap={!isDisabled ? {
        y: 0,
        transition: { duration: lumenDurations.fast },
      } : undefined}
      {...props}
    >
      {isLoading && (
        <motion.span
          className="absolute inset-0 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <svg
            className="animate-spin h-5 w-5"
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
        </motion.span>
      )}
      <span className={cn("flex items-center gap-2", isLoading && "invisible")}>
        {leftIcon}
        {children}
        {rightIcon}
      </span>
    </motion.button>
  )
}
