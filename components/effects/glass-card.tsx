"use client"

import { cn } from "@/lib/utils"
import type { ReactNode } from "react"
import { motion, type HTMLMotionProps } from "framer-motion"

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
    "bg-white/60 dark:bg-white/5",
    "backdrop-blur-lg",
    "border border-white/40 dark:border-white/10",
  ),
  normal: cn(
    "bg-white/75 dark:bg-white/5",
    "backdrop-blur-xl",
    "border border-white/50 dark:border-white/10",
  ),
  elevated: cn(
    "bg-white/90 dark:bg-white/10",
    "backdrop-blur-2xl",
    "border border-white/50 dark:border-white/15",
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
  return (
    <motion.div
      className={cn(
        "relative rounded-2xl",
        // Glass surface
        glassStyles[glass],
        // Soft shadow
        "shadow-[0_4px_20px_rgba(197,221,240,0.15)]",
        // Hover glow
        hover && glowColors[glowColor],
        // Transition
        "transition-shadow duration-300",
        className,
      )}
      // Gentle motion
      whileHover={hover ? {
        y: -2,
        transition: {
          duration: 0.3,
          ease: [0.25, 0.1, 0.25, 1],
        },
      } : undefined}
      whileTap={pressable ? {
        y: 0,
        transition: { duration: 0.2 },
      } : undefined}
      {...props}
    >
      {/* Inner glow gradient overlay */}
      <div className="absolute inset-0 rounded-2xl bg-linear-to-br from-white/10 to-transparent pointer-events-none" />
      {/* Content */}
      <div className="relative">
        {children}
      </div>
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
        "shadow-[0_4px_20px_rgba(197,221,240,0.15)]",
        className,
      )}
    >
      <div className="absolute inset-0 rounded-2xl bg-linear-to-br from-white/10 to-transparent pointer-events-none" />
      <div className="relative">
        {children}
      </div>
    </div>
  )
}
