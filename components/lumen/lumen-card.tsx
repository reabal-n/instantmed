"use client"

import * as React from "react"
import { motion, type HTMLMotionProps } from "framer-motion"
import { cn } from "@/lib/utils"
import { motionDurations, motionEasing } from "@/components/ui/motion"

export interface LumenCardProps extends Omit<HTMLMotionProps<"div">, "children"> {
  children: React.ReactNode
  /** Glass intensity */
  glass?: "subtle" | "normal" | "elevated"
  /** Enable hover effects */
  hoverable?: boolean
  /** Enable press effect */
  pressable?: boolean
  /** Remove padding */
  noPadding?: boolean
}

// Night sky compatible glass styles
const glassStyles = {
  subtle: cn(
    "bg-white/60 dark:bg-white/5",
    "backdrop-blur-lg",
    "border border-sky-300/25 dark:border-white/10",
    "shadow-[0_4px_20px_rgba(197,221,240,0.10)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.25)]",
  ),
  normal: cn(
    "bg-white/75 dark:bg-white/5",
    "backdrop-blur-xl",
    "border border-sky-300/35 dark:border-white/10",
    "shadow-[0_4px_20px_rgba(197,221,240,0.15)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.30)]",
  ),
  elevated: cn(
    "bg-white/90 dark:bg-white/10",
    "backdrop-blur-2xl",
    "border border-sky-300/45 dark:border-white/15",
    "shadow-[0_8px_30px_rgba(197,221,240,0.20)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.35)]",
  ),
}

export function LumenCard({
  children,
  glass = "normal",
  hoverable = true,
  pressable = false,
  noPadding = false,
  className,
  ...props
}: LumenCardProps) {
  return (
    <motion.div
      className={cn(
        // Base styles
        "relative rounded-2xl overflow-hidden",
        // Glass styles
        glassStyles[glass],
        // Padding
        !noPadding && "p-6",
        // Transition
        "transition-colors duration-300",
        className
      )}
      whileHover={hoverable ? {
        y: -2,
        transition: {
          duration: motionDurations.normal,
          ease: motionEasing.gentle,
        },
      } : undefined}
      whileTap={pressable ? {
        y: 0,
        transition: { duration: motionDurations.fast },
      } : undefined}
      {...props}
    >
      {/* Subtle inner glow */}
      <div className="absolute inset-0 rounded-2xl bg-linear-to-br from-white/5 to-transparent pointer-events-none" />
      {/* Content */}
      <div className="relative">
        {children}
      </div>
    </motion.div>
  )
}

export function LumenCardHeader({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex flex-col gap-1.5 pb-4",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export function LumenCardContent({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("", className)}
      {...props}
    >
      {children}
    </div>
  )
}

export function LumenCardFooter({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 pt-4",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}
