"use client"

import { useRef, useEffect, useState, ReactNode } from "react"
import { motion, useMotionValue, useSpring } from "framer-motion"
import { cn } from "@/lib/utils"

interface CursorSpotlightProps {
  children: ReactNode
  className?: string
  spotlightColor?: string
  spotlightSize?: number
  opacity?: number
}

// Spotlight effect that follows cursor
export function CursorSpotlight({
  children,
  className,
  spotlightColor = "rgba(0, 226, 181, 0.15)",
  spotlightSize = 400,
  opacity = 1,
}: CursorSpotlightProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)

  const smoothX = useSpring(mouseX, { stiffness: 100, damping: 30 })
  const smoothY = useSpring(mouseY, { stiffness: 100, damping: 30 })

  const [isHovered, setIsHovered] = useState(false)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect()
      mouseX.set(e.clientX - rect.left)
      mouseY.set(e.clientY - rect.top)
    }

    container.addEventListener("mousemove", handleMouseMove)
    return () => container.removeEventListener("mousemove", handleMouseMove)
  }, [mouseX, mouseY])

  return (
    <div
      ref={containerRef}
      className={cn("relative overflow-hidden", className)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Spotlight */}
      <motion.div
        className="pointer-events-none absolute"
        style={{
          width: spotlightSize,
          height: spotlightSize,
          x: smoothX,
          y: smoothY,
          translateX: "-50%",
          translateY: "-50%",
          background: `radial-gradient(circle, ${spotlightColor}, transparent 70%)`,
          opacity: isHovered ? opacity : 0,
        }}
        transition={{ opacity: { duration: 0.3 } }}
      />
      {children}
    </div>
  )
}

// Grid spotlight effect - reveals grid on hover
interface GridSpotlightProps {
  children: ReactNode
  className?: string
  gridColor?: string
  gridSize?: number
  spotlightSize?: number
}

export function GridSpotlight({
  children,
  className,
  gridColor = "rgba(0, 226, 181, 0.1)",
  gridSize = 40,
  spotlightSize = 300,
}: GridSpotlightProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  const [isHovered, setIsHovered] = useState(false)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect()
      setMousePosition({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      })
    }

    container.addEventListener("mousemove", handleMouseMove)
    return () => container.removeEventListener("mousemove", handleMouseMove)
  }, [])

  return (
    <div
      ref={containerRef}
      className={cn("relative overflow-hidden", className)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Grid pattern */}
      <div
        className="pointer-events-none absolute inset-0 transition-opacity duration-500"
        style={{
          opacity: isHovered ? 1 : 0,
          backgroundImage: `linear-gradient(${gridColor} 1px, transparent 1px), linear-gradient(90deg, ${gridColor} 1px, transparent 1px)`,
          backgroundSize: `${gridSize}px ${gridSize}px`,
          maskImage: `radial-gradient(circle ${spotlightSize}px at ${mousePosition.x}px ${mousePosition.y}px, black, transparent)`,
          WebkitMaskImage: `radial-gradient(circle ${spotlightSize}px at ${mousePosition.x}px ${mousePosition.y}px, black, transparent)`,
        }}
      />
      {children}
    </div>
  )
}

// Beam effect that follows cursor
interface BeamSpotlightProps {
  className?: string
  beamColor?: string
}

export function BeamSpotlight({
  className,
  beamColor = "rgba(0, 226, 181, 0.3)",
}: BeamSpotlightProps) {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY })
    }

    window.addEventListener("mousemove", handleMouseMove)
    return () => window.removeEventListener("mousemove", handleMouseMove)
  }, [])

  return (
    <div className={cn("pointer-events-none fixed inset-0 z-50 overflow-hidden", className)}>
      <motion.div
        className="absolute h-[200px] w-[2px]"
        style={{
          background: `linear-gradient(to bottom, transparent, ${beamColor}, transparent)`,
          left: mousePosition.x,
          top: mousePosition.y - 100,
        }}
        animate={{
          opacity: [0.5, 1, 0.5],
          scaleY: [0.8, 1, 0.8],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
    </div>
  )
}

// Card with spotlight border effect
interface SpotlightCardProps {
  children: ReactNode
  className?: string
  spotlightColor?: string
}

export function SpotlightCard({
  children,
  className,
  spotlightColor = "rgba(0, 226, 181, 0.5)",
}: SpotlightCardProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isHovered, setIsHovered] = useState(false)

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return
    const rect = cardRef.current.getBoundingClientRect()
    setPosition({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    })
  }

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        "relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl",
        className
      )}
    >
      {/* Spotlight border */}
      <motion.div
        className="pointer-events-none absolute -inset-px rounded-2xl"
        style={{
          background: `radial-gradient(300px circle at ${position.x}px ${position.y}px, ${spotlightColor}, transparent 70%)`,
        }}
        animate={{ opacity: isHovered ? 1 : 0 }}
        transition={{ duration: 0.3 }}
      />
      
      {/* Inner glow */}
      <motion.div
        className="pointer-events-none absolute inset-0 rounded-2xl"
        style={{
          background: `radial-gradient(600px circle at ${position.x}px ${position.y}px, rgba(0, 226, 181, 0.06), transparent 50%)`,
        }}
        animate={{ opacity: isHovered ? 1 : 0 }}
        transition={{ duration: 0.3 }}
      />
      
      <div className="relative z-10">{children}</div>
    </div>
  )
}
