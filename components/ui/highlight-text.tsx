"use client"

import * as React from "react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

interface HighlightTextProps extends React.HTMLAttributes<HTMLSpanElement> {
  text: string
  highlightColor?: string
  duration?: number
  delay?: number
  className?: string
}

export function HighlightText({
  text,
  highlightColor = "hsl(var(--primary) / 0.2)",
  duration = 1,
  delay = 0.3,
  className,
}: HighlightTextProps) {
  return (
    <motion.span
      className={cn("relative inline-block py-1 px-2 rounded-lg", className)}
      initial={{
        backgroundColor: "transparent",
      }}
      animate={{
        backgroundColor: highlightColor,
      }}
      transition={{
        duration,
        delay,
        ease: "easeOut",
      }}
    >
      {text}
    </motion.span>
  )
}

export default HighlightText
