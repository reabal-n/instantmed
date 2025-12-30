"use client"

import { ReactNode, useRef } from "react"
import { motion, useScroll, useTransform, useSpring, useMotionValue } from "framer-motion"
import { cn } from "@/lib/utils"

interface FloatingElementProps {
  children: ReactNode
  className?: string
  amplitude?: number // How much the element moves
  frequency?: number // How fast the element moves
  delay?: number
  direction?: "vertical" | "horizontal" | "both" | "diagonal"
}

// Smooth floating animation
export function FloatingElement({
  children,
  className,
  amplitude = 15,
  frequency = 4,
  delay = 0,
  direction = "vertical",
}: FloatingElementProps) {
  const getAnimation = () => {
    switch (direction) {
      case "horizontal":
        return { x: [0, amplitude, 0, -amplitude, 0] }
      case "both":
        return { x: [0, amplitude, 0, -amplitude, 0], y: [0, amplitude, 0, -amplitude, 0] }
      case "diagonal":
        return { x: [0, amplitude, 0], y: [0, -amplitude, 0] }
      default:
        return { y: [0, -amplitude, 0] }
    }
  }

  return (
    <motion.div
      className={className}
      animate={getAnimation()}
      transition={{
        duration: frequency,
        repeat: Infinity,
        ease: "easeInOut",
        delay,
      }}
    >
      {children}
    </motion.div>
  )
}

// Parallax floating based on scroll
interface ParallaxFloatProps {
  children: ReactNode
  className?: string
  speed?: number // Multiplier for scroll effect
  direction?: "up" | "down"
}

export function ParallaxFloat({
  children,
  className,
  speed = 0.5,
  direction = "up",
}: ParallaxFloatProps) {
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  })

  const multiplier = direction === "up" ? -1 : 1
  const y = useTransform(scrollYProgress, [0, 1], [100 * speed * multiplier, -100 * speed * multiplier])
  const smoothY = useSpring(y, { stiffness: 100, damping: 30 })

  return (
    <motion.div ref={ref} style={{ y: smoothY }} className={className}>
      {children}
    </motion.div>
  )
}

// Scale on scroll
interface ScaleOnScrollProps {
  children: ReactNode
  className?: string
  scaleRange?: [number, number]
}

export function ScaleOnScroll({
  children,
  className,
  scaleRange = [0.8, 1],
}: ScaleOnScrollProps) {
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "center center"],
  })

  const scale = useTransform(scrollYProgress, [0, 1], scaleRange)
  const opacity = useTransform(scrollYProgress, [0, 0.5, 1], [0, 1, 1])

  return (
    <motion.div ref={ref} style={{ scale, opacity }} className={className}>
      {children}
    </motion.div>
  )
}

// Rotate on scroll
interface RotateOnScrollProps {
  children: ReactNode
  className?: string
  rotateRange?: [number, number]
}

export function RotateOnScroll({
  children,
  className,
  rotateRange = [-10, 10],
}: RotateOnScrollProps) {
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  })

  const rotate = useTransform(scrollYProgress, [0, 1], rotateRange)

  return (
    <motion.div ref={ref} style={{ rotate }} className={className}>
      {children}
    </motion.div>
  )
}

// Mouse follow element
interface MouseFollowProps {
  children: ReactNode
  className?: string
  strength?: number
  ease?: number
}

export function MouseFollow({
  children,
  className,
  strength: _strength = 20,
  ease = 0.1,
}: MouseFollowProps) {
  const ref = useRef<HTMLDivElement>(null)
  const x = useMotionValue(0)
  const y = useMotionValue(0)

  const springConfig = { stiffness: 150, damping: 15 }
  const smoothX = useSpring(x, springConfig)
  const smoothY = useSpring(y, springConfig)

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!ref.current) return
    const rect = ref.current.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2
    
    x.set((e.clientX - centerX) * ease)
    y.set((e.clientY - centerY) * ease)
  }

  const handleMouseLeave = () => {
    x.set(0)
    y.set(0)
  }

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ x: smoothX, y: smoothY }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// 3D Tilt effect
interface Tilt3DProps {
  children: ReactNode
  className?: string
  maxTilt?: number
  perspective?: number
  scale?: number
  glare?: boolean
}

export function Tilt3D({
  children,
  className,
  maxTilt = 10,
  perspective = 1000,
  scale = 1.02,
  glare = true,
}: Tilt3DProps) {
  const ref = useRef<HTMLDivElement>(null)
  const rotateX = useMotionValue(0)
  const rotateY = useMotionValue(0)
  const glareX = useMotionValue(50)
  const glareY = useMotionValue(50)

  const springConfig = { stiffness: 300, damping: 20 }
  const smoothRotateX = useSpring(rotateX, springConfig)
  const smoothRotateY = useSpring(rotateY, springConfig)

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!ref.current) return
    const rect = ref.current.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2
    
    const percentX = (e.clientX - centerX) / (rect.width / 2)
    const percentY = (e.clientY - centerY) / (rect.height / 2)
    
    rotateX.set(-percentY * maxTilt)
    rotateY.set(percentX * maxTilt)
    glareX.set(((e.clientX - rect.left) / rect.width) * 100)
    glareY.set(((e.clientY - rect.top) / rect.height) * 100)
  }

  const handleMouseLeave = () => {
    rotateX.set(0)
    rotateY.set(0)
  }

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        perspective,
        rotateX: smoothRotateX,
        rotateY: smoothRotateY,
        transformStyle: "preserve-3d",
      }}
      whileHover={{ scale }}
      transition={{ duration: 0.2 }}
      className={cn("relative", className)}
    >
      {children}
      {glare && (
        <motion.div
          className="pointer-events-none absolute inset-0 rounded-inherit"
          style={{
            background: `radial-gradient(circle at ${glareX.get()}% ${glareY.get()}%, rgba(255,255,255,0.2), transparent 50%)`,
            borderRadius: "inherit",
          }}
        />
      )}
    </motion.div>
  )
}

// Orbit animation for decorative elements
interface OrbitProps {
  children: ReactNode
  className?: string
  radius?: number
  duration?: number
  reverse?: boolean
  startAngle?: number
}

export function Orbit({
  children,
  className,
  radius = 100,
  duration = 20,
  reverse = false,
  startAngle = 0,
}: OrbitProps) {
  return (
    <motion.div
      className={cn("absolute", className)}
      animate={{
        rotate: reverse ? [startAngle, startAngle - 360] : [startAngle, startAngle + 360],
      }}
      transition={{
        duration,
        repeat: Infinity,
        ease: "linear",
      }}
      style={{
        transformOrigin: `${radius}px center`,
      }}
    >
      <motion.div
        animate={{
          rotate: reverse ? [0, 360] : [0, -360],
        }}
        transition={{
          duration,
          repeat: Infinity,
          ease: "linear",
        }}
      >
        {children}
      </motion.div>
    </motion.div>
  )
}
