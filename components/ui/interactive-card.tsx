"use client"

import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { ReactNode } from "react"

interface InteractiveCardProps {
  children: ReactNode
  className?: string
  onClick?: () => void
  /** Enable hover lift effect */
  hover?: boolean
  /** Enable click scale effect */
  clickable?: boolean
  /** Custom animation variants */
  variants?: any
}

export function InteractiveCard({
  children,
  className,
  onClick,
  hover = true,
  clickable = false,
  variants,
}: InteractiveCardProps) {
  const defaultVariants = {
    rest: { scale: 1, y: 0 },
    hover: hover ? { scale: 1.01, y: -2 } : {},
    tap: clickable || onClick ? { scale: 0.98 } : {},
  }

  const cardVariants = variants || defaultVariants

  return (
    <motion.div
      className={cn(
        "transition-all duration-300",
        onClick && "cursor-pointer",
        className
      )}
      variants={cardVariants}
      initial="rest"
      whileHover={hover ? "hover" : undefined}
      whileTap={clickable || onClick ? "tap" : undefined}
      onClick={onClick}
    >
      {children}
    </motion.div>
  )
}

