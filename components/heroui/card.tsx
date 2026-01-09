"use client"

import * as React from "react"
import { Card as HeroCard, CardHeader, CardBody, CardFooter } from "@heroui/react"
import { cn } from "@/lib/utils"

export interface CardProps {
  children: React.ReactNode
  className?: string
  isPressable?: boolean
  isHoverable?: boolean
  shadow?: "none" | "sm" | "md" | "lg"
  /** Intensity of glass effect */
  glass?: "subtle" | "normal" | "elevated"
}

export function Card({ 
  className, 
  children, 
  glass = "normal",
  isPressable,
  isHoverable = true,
  ...props 
}: CardProps) {
  // Soft Pop Glass intensity variants
  const glassVariants = {
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

  return (
    <HeroCard
      className={cn("text-card-foreground", className)}
      isPressable={isPressable}
      isHoverable={isHoverable}
      classNames={{
        base: cn(
          // Soft Pop Glass surface
          glassVariants[glass],
          // Geometry: rounded-2xl for cards
          "rounded-2xl",
          // Soft glow shadow (not black!)
          "shadow-[0_8px_30px_rgba(0,0,0,0.06)]",
          // Motion: hover lift with colored glow
          "transition-all duration-300 ease-out",
          isHoverable && [
            "hover:bg-white/85 dark:hover:bg-gray-900/80",
            "hover:-translate-y-1",
            "hover:shadow-[0_20px_40px_rgba(59,130,246,0.12)]",
            "dark:hover:shadow-[0_20px_40px_rgba(139,92,246,0.15)]",
          ],
          // Press effect
          isPressable && "active:scale-[0.98]",
        ),
      }}
      {...props}
    >
      {children}
    </HeroCard>
  )
}

export { CardHeader, CardBody, CardFooter }
