"use client"

import { ReactNode, useState } from "react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

interface GlowingCardProps {
  children: ReactNode
  className?: string
  glowColor?: string
  intensity?: "low" | "medium" | "high"
}

export function GlowingCard({ 
  children, 
  className,
  glowColor = "rgba(0, 226, 181, 0.3)",
  intensity = "medium"
}: GlowingCardProps) {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  const [isHovered, setIsHovered] = useState(false)

  const intensityMap = {
    low: "0 0 20px",
    medium: "0 0 40px, 0 0 80px",
    high: "0 0 40px, 0 0 80px, 0 0 120px",
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    setMousePosition({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    })
  }

  return (
    <motion.div
      className={cn("relative rounded-2xl border border-border/50 overflow-hidden", className)}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        background: isHovered
          ? `radial-gradient(circle at ${mousePosition.x}px ${mousePosition.y}px, ${glowColor}, transparent 50%)`
          : undefined,
      }}
    >
      <div className="relative z-10 p-6">{children}</div>
      {isHovered && (
        <motion.div
          className="absolute inset-0 pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            background: `radial-gradient(circle at ${mousePosition.x}px ${mousePosition.y}px, ${glowColor}, transparent 60%)`,
            boxShadow: intensityMap[intensity],
          }}
        />
      )}
    </motion.div>
  )
}
