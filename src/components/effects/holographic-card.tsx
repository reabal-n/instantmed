"use client"

import { cn } from "@/lib/utils"
import type { ReactNode } from "react"
import { useRef, useEffect, useState } from "react"

interface HolographicCardProps {
  children: ReactNode
  className?: string
  hover?: boolean
  intensity?: "low" | "medium" | "high"
}

export function HolographicCard({ children, className, hover = true, intensity = "medium" }: HolographicCardProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  const [isHovered, setIsHovered] = useState(false)

  const intensityMap = {
    low: { blur: "blur-xl", opacity: "opacity-30", glow: "rgba(0, 226, 181, 0.15)" },
    medium: { blur: "blur-xl", opacity: "opacity-40", glow: "rgba(0, 226, 181, 0.25)" },
    high: { blur: "blur-2xl", opacity: "opacity-50", glow: "rgba(0, 226, 181, 0.35)" },
  }

  const currentIntensity = intensityMap[intensity]

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!cardRef.current) return

      const rect = cardRef.current.getBoundingClientRect()
      const x = ((e.clientX - rect.left) / rect.width) * 100
      const y = ((e.clientY - rect.top) / rect.height) * 100

      setMousePosition({ x, y })
    }

    const card = cardRef.current
    if (card && hover) {
      card.addEventListener("mousemove", handleMouseMove)
      card.addEventListener("mouseenter", () => setIsHovered(true))
      card.addEventListener("mouseleave", () => setIsHovered(false))

      return () => {
        card.removeEventListener("mousemove", handleMouseMove)
        card.removeEventListener("mouseenter", () => setIsHovered(true))
        card.removeEventListener("mouseleave", () => setIsHovered(false))
      }
    }
  }, [hover])

  return (
    <div
      ref={cardRef}
      className={cn(
        "relative rounded-2xl overflow-hidden",
        "backdrop-blur-xl",
        "bg-gradient-to-br from-white/20 via-white/10 to-white/5",
        "dark:from-black/30 dark:via-black/20 dark:to-black/10",
        "border border-white/30 dark:border-white/20",
        "shadow-[0_8px_32px_0_rgba(0,0,0,0.1)]",
        "transition-all duration-500",
        hover && isHovered && "scale-[1.02] shadow-[0_12px_48px_0_rgba(0,226,181,0.2)]",
        className,
      )}
      style={{
        transform: hover && isHovered
          ? `perspective(1000px) rotateX(${(mousePosition.y - 50) * 0.05}deg) rotateY(${(mousePosition.x - 50) * 0.05}deg) scale(1.02)`
          : undefined,
        transformStyle: "preserve-3d",
      }}
    >
      {/* Animated gradient overlay */}
      <div
        className="absolute inset-0 opacity-0 transition-opacity duration-500 pointer-events-none"
        style={{
          opacity: hover && isHovered ? 0.3 : 0,
          background: `radial-gradient(circle at ${mousePosition.x}% ${mousePosition.y}%, rgba(0, 226, 181, 0.3), transparent 70%)`,
        }}
      />

      {/* Holographic shine effect */}
      <div
        className="absolute inset-0 opacity-0 transition-opacity duration-500 pointer-events-none"
        style={{
          opacity: hover && isHovered ? 0.4 : 0,
          background: `linear-gradient(${135 + (mousePosition.x - 50) * 0.5}deg, transparent 30%, rgba(255, 255, 255, 0.3) 50%, transparent 70%)`,
          transform: `translate(${(mousePosition.x - 50) * 0.1}px, ${(mousePosition.y - 50) * 0.1}px)`,
        }}
      />

      {/* Glow effect */}
      <div
        className={cn(
          "absolute -inset-1 rounded-2xl transition-opacity duration-500 pointer-events-none",
          currentIntensity.blur,
        )}
        style={{
          opacity: hover && isHovered ? 1 : 0,
          background: `radial-gradient(circle at ${mousePosition.x}% ${mousePosition.y}%, ${currentIntensity.glow}, transparent 70%)`,
        }}
      />

      {/* Content */}
      <div className="relative z-10">{children}</div>

      {/* Subtle border glow */}
      <div
        className="absolute inset-0 rounded-2xl pointer-events-none transition-opacity duration-500"
        style={{
          opacity: hover && isHovered ? 0.6 : 0.3,
          boxShadow: `inset 0 0 20px rgba(0, 226, 181, 0.1), 0 0 40px ${currentIntensity.glow}`,
        }}
      />
    </div>
  )
}
