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

const glassStyles = {
  subtle: cn(
    "bg-white/50 dark:bg-gray-900/40",
    "backdrop-blur-lg",
    "border border-white/30 dark:border-white/8",
  ),
  normal: cn(
    "bg-white/70 dark:bg-gray-900/60",
    "backdrop-blur-xl",
    "border border-white/40 dark:border-white/10",
  ),
  elevated: cn(
    "bg-white/85 dark:bg-gray-900/80",
    "backdrop-blur-2xl",
    "border border-white/50 dark:border-white/15",
  ),
}

const glowColors = {
  blue: "hover:shadow-[0_20px_40px_rgba(59,130,246,0.15)]",
  purple: "hover:shadow-[0_20px_40px_rgba(139,92,246,0.15)]",
  emerald: "hover:shadow-[0_20px_40px_rgba(34,197,94,0.15)]",
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
        // Soft Pop Glass surface
        glassStyles[glass],
        // Soft shadow (not black!)
        "shadow-[0_8px_30px_rgba(0,0,0,0.06)]",
        // Hover glow
        hover && glowColors[glowColor],
        // Transition
        "transition-shadow duration-300",
        className,
      )}
      // Spring physics motion
      whileHover={hover ? {
        y: -4,
        scale: 1.01,
        transition: {
          type: "spring",
          stiffness: 400,
          damping: 30,
        },
      } : undefined}
      whileTap={pressable ? {
        scale: 0.98,
        transition: { duration: 0.1 },
      } : undefined}
      {...props}
    >
      {/* Inner glow gradient overlay */}
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
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
        "shadow-[0_8px_30px_rgba(0,0,0,0.06)]",
        className,
      )}
    >
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
      <div className="relative">
        {children}
      </div>
    </div>
  )
}
