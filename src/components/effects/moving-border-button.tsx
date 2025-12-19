"use client"

import { ReactNode, useRef, useState, useEffect } from "react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { Button, ButtonProps } from "@/components/ui/button"

interface MovingBorderButtonProps extends ButtonProps {
  children: ReactNode
  borderColor?: string
  borderWidth?: number
  duration?: number
}

export function MovingBorderButton({
  children,
  className,
  borderColor = "#00E2B5",
  borderWidth = 2,
  duration = 3,
  ...props
}: MovingBorderButtonProps) {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  const buttonRef = useRef<HTMLButtonElement>(null)

  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!buttonRef.current) return
    const rect = buttonRef.current.getBoundingClientRect()
    setMousePosition({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    })
  }

  return (
    <Button
      ref={buttonRef}
      className={cn("relative overflow-hidden", className)}
      onMouseMove={handleMouseMove}
      {...props}
    >
      <motion.div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(circle at ${mousePosition.x}px ${mousePosition.y}px, ${borderColor}, transparent 70%)`,
        }}
        animate={{
          opacity: [0.3, 0.6, 0.3],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      <motion.svg
        className="absolute inset-0 w-full h-full"
        style={{ pointerEvents: "none" }}
        initial={false}
        animate={{
          pathLength: [0, 1, 0],
        }}
        transition={{
          duration,
          repeat: Infinity,
          ease: "linear",
        }}
      >
        <motion.rect
          x={borderWidth / 2}
          y={borderWidth / 2}
          width="calc(100% - 2px)"
          height="calc(100% - 2px)"
          rx="9999px"
          fill="none"
          stroke={borderColor}
          strokeWidth={borderWidth}
          strokeDasharray="200"
          strokeDashoffset="0"
          pathLength={1}
        />
      </motion.svg>
      <span className="relative z-10">{children}</span>
    </Button>
  )
}
