"use client"

import { cn } from "@/lib/utils"
import type { ReactNode } from "react"
import { motion, type HTMLMotionProps } from "framer-motion"
import { useReducedMotion } from "@/components/ui/motion"

interface GlassCardProps extends Omit<HTMLMotionProps<"div">, "children"> {
  children: ReactNode
  className?: string
  /** Enable hover lift effect */
  hover?: boolean
  /** Glass intensity level */
  glass?: "subtle" | "normal" | "elevated"
  /** Enable press/tap effect */
  pressable?: boolean
  /** Glow color on hover */
  glowColor?: "blue" | "purple" | "emerald" | "none"
}

// Glass styles
const glassStyles = {
  subtle: cn(
    "bg-white dark:bg-card",
    "border border-border/50 dark:border-white/15",
    "shadow-sm shadow-primary/[0.04] dark:shadow-none",
  ),
  normal: cn(
    "bg-white dark:bg-card",
    "border border-border/50 dark:border-white/15",
    "shadow-md shadow-primary/[0.06] dark:shadow-none",
  ),
  elevated: cn(
    "bg-white dark:bg-card",
    "border border-border/50 dark:border-white/15",
    "shadow-lg shadow-primary/[0.1] dark:shadow-none",
  ),
}

// Glow colors
const glowColors = {
  blue: "hover:shadow-[0_8px_30px_rgba(197,221,240,0.20)] dark:hover:shadow-[0_8px_30px_rgba(148,163,184,0.15)]",
  purple: "hover:shadow-[0_8px_30px_rgba(245,169,98,0.20)] dark:hover:shadow-[0_8px_30px_rgba(249,201,146,0.12)]",
  emerald: "hover:shadow-[0_8px_30px_rgba(107,191,138,0.20)] dark:hover:shadow-[0_8px_30px_rgba(134,239,172,0.12)]",
  none: "",
}

export function GlassCard({
  children,
  className,
  hover = true,
  glass = "normal",
  pressable = false,
  glowColor = "blue",
  ...props
}: GlassCardProps) {
  const prefersReducedMotion = useReducedMotion()

  return (
    <motion.div
      className={cn(
        "relative rounded-2xl",
        // Glass surface
        glassStyles[glass],
        // Soft shadow
        "shadow-md shadow-primary/[0.06]",
        // Hover glow
        hover && glowColors[glowColor],
        // Transition
        "transition-shadow duration-300",
        className,
      )}
      // Gentle motion
      whileHover={hover && !prefersReducedMotion ? {
        y: -2,
        transition: {
          duration: 0.3,
          ease: [0.25, 0.1, 0.25, 1],
        },
      } : undefined}
      whileTap={pressable && !prefersReducedMotion ? {
        y: 0,
        transition: { duration: 0.2 },
      } : undefined}
      {...props}
    >
      {children}
    </motion.div>
  )
}

// Simpler non-motion version for static content
export function GlassPanel({ 
  children, 
  className, 
  glass = "normal",
}: {
  children: ReactNode
  className?: string
  glass?: "subtle" | "normal" | "elevated"
}) {
  return (
    <div
      className={cn(
        "relative rounded-2xl",
        glassStyles[glass],
        "shadow-md shadow-primary/[0.06]",
        className,
      )}
    >
      {children}
    </div>
  )
}
