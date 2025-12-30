"use client"

import { useEffect, useRef, useState } from "react"
import { motion, useMotionValue } from "framer-motion"
import { cn } from "@/lib/utils"

interface Particle {
  x: number
  y: number
  size: number
  speedX: number
  speedY: number
  opacity: number
  color: string
}

interface ParticleParallaxBackgroundProps {
  className?: string
  particleCount?: number
  intensity?: "low" | "medium" | "high"
}

const COLORS = [
  "oklch(0.65 0.2 265)", // Indigo
  "oklch(0.6 0.22 280)", // Violet
  "oklch(0.7 0.18 290)", // Purple
  "oklch(0.55 0.15 255)", // Deep indigo
]

export function ParticleParallaxBackground({
  className,
  particleCount: _particleCount = 50,
  intensity = "medium",
}: ParticleParallaxBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const particlesRef = useRef<Particle[]>([])
  const animationFrameRef = useRef<number | undefined>(undefined)
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 })
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(() => {
    if (typeof window === "undefined") return false
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches
  })
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === "undefined") return false
    return window.innerWidth < 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
  })

  // Check for reduced motion preference
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)")
    const handleChange = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches)
    mediaQuery.addEventListener("change", handleChange)
    return () => mediaQuery.removeEventListener("change", handleChange)
  }, [])

  // Detect mobile devices
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent))
    }
    window.addEventListener("resize", checkMobile)
    return () => window.removeEventListener("resize", checkMobile)
  }, [])

  const intensityMap = {
    low: { speed: 0.3, size: 1.5, count: 30 },
    medium: { speed: 0.5, size: 2, count: 50 },
    high: { speed: 0.8, size: 2.5, count: 80 },
  }

  // Reduce particle count on mobile or if reduced motion is preferred
  const adjustedIntensity = prefersReducedMotion ? "low" : isMobile ? (intensity === "high" ? "medium" : intensity) : intensity
  const config = intensityMap[adjustedIntensity]

  // Initialize particles
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const resizeCanvas = () => {
      const width = window.innerWidth
      const height = window.innerHeight
      canvas.width = width
      canvas.height = height
      setDimensions({ width, height })

      // Reinitialize particles on resize
      particlesRef.current = Array.from({ length: config.count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        size: Math.random() * config.size + 1,
        speedX: (Math.random() - 0.5) * config.speed,
        speedY: (Math.random() - 0.5) * config.speed,
        opacity: Math.random() * 0.5 + 0.2,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
      }))
    }

    resizeCanvas()
    window.addEventListener("resize", resizeCanvas)

    return () => {
      window.removeEventListener("resize", resizeCanvas)
    }
  }, [config.count, config.size, config.speed])

  // Mouse tracking for parallax
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mouseX.set(e.clientX)
      mouseY.set(e.clientY)
    }

    window.addEventListener("mousemove", handleMouseMove)
    return () => window.removeEventListener("mousemove", handleMouseMove)
  }, [mouseX, mouseY])

  // Animation loop
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || dimensions.width === 0) return

    const ctx = canvas.getContext("2d", { alpha: true })
    if (!ctx) return

    let lastTime = performance.now()
    const targetFPS = 60
    const frameInterval = 1000 / targetFPS

    const animate = (currentTime: number) => {
      const deltaTime = currentTime - lastTime

      if (deltaTime >= frameInterval) {
        ctx.clearRect(0, 0, canvas.width, canvas.height)

        const mouseXValue = mouseX.get()
        const mouseYValue = mouseY.get()

        particlesRef.current.forEach((particle, index) => {
          // Parallax effect based on mouse position (reduced on mobile)
          const parallaxMultiplier = isMobile ? 0.5 : 1
          const parallaxX = (mouseXValue - canvas.width / 2) * 0.01 * parallaxMultiplier
          const parallaxY = (mouseYValue - canvas.height / 2) * 0.01 * parallaxMultiplier

          // Update position
          particle.x += particle.speedX + parallaxX * 0.1
          particle.y += particle.speedY + parallaxY * 0.1

          // Wrap around edges
          if (particle.x < 0) particle.x = canvas.width
          if (particle.x > canvas.width) particle.x = 0
          if (particle.y < 0) particle.y = canvas.height
          if (particle.y > canvas.height) particle.y = 0

          // Draw particle with glow effect
          const gradient = ctx.createRadialGradient(
            particle.x,
            particle.y,
            0,
            particle.x,
            particle.y,
            particle.size * 2
          )
          gradient.addColorStop(0, particle.color)
          gradient.addColorStop(1, "transparent")

          ctx.beginPath()
          ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2)
          ctx.fillStyle = gradient
          ctx.globalAlpha = particle.opacity
          ctx.fill()

          // Draw connections to nearby particles (only check particles after current to avoid duplicates)
          for (let i = index + 1; i < particlesRef.current.length; i++) {
            const other = particlesRef.current[i]
            const dx = particle.x - other.x
            const dy = particle.y - other.y
            const distance = Math.sqrt(dx * dx + dy * dy)

            if (distance < 150) {
              const lineGradient = ctx.createLinearGradient(
                particle.x,
                particle.y,
                other.x,
                other.y
              )
              lineGradient.addColorStop(0, particle.color)
              lineGradient.addColorStop(1, other.color)

              ctx.beginPath()
              ctx.moveTo(particle.x, particle.y)
              ctx.lineTo(other.x, other.y)
              ctx.strokeStyle = lineGradient
              ctx.globalAlpha = (1 - distance / 150) * 0.15
              ctx.lineWidth = 0.5
              ctx.stroke()
            }
          }
        })

        ctx.globalAlpha = 1
        lastTime = currentTime - (deltaTime % frameInterval)
      }

      animationFrameRef.current = requestAnimationFrame(animate)
    }

    animationFrameRef.current = requestAnimationFrame(animate)

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [dimensions, mouseX, mouseY, isMobile])

  // Don't render if reduced motion is preferred
  if (prefersReducedMotion) {
    return (
      <div className={cn("fixed inset-0 -z-10 overflow-hidden pointer-events-none", className)}>
        <div
          className="absolute inset-0"
          style={{
            background: "radial-gradient(ellipse 80% 50% at 50% 0%, oklch(0.92 0.1 280 / 0.2), transparent 50%)",
          }}
        />
      </div>
    )
  }

  return (
    <div className={cn("fixed inset-0 -z-10 overflow-hidden pointer-events-none", className)}>
      {/* Animated gradient background */}
      <motion.div
        className="absolute inset-0"
        animate={{
          background: [
            "radial-gradient(ellipse 80% 50% at 20% 20%, oklch(0.92 0.12 265 / 0.3), transparent 50%)",
            "radial-gradient(ellipse 80% 50% at 80% 30%, oklch(0.9 0.14 280 / 0.3), transparent 50%)",
            "radial-gradient(ellipse 80% 50% at 50% 70%, oklch(0.88 0.12 290 / 0.3), transparent 50%)",
            "radial-gradient(ellipse 80% 50% at 20% 20%, oklch(0.92 0.12 265 / 0.3), transparent 50%)",
          ],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "linear",
        }}
      />

      {/* Floating gradient orbs */}
      <motion.div
        className="absolute -top-40 -left-40 w-96 h-96 rounded-full blur-3xl opacity-20"
        style={{
          background: "radial-gradient(circle, oklch(0.65 0.2 265), transparent)",
        }}
        animate={{
          x: [0, 100, -50, 0],
          y: [0, 50, 100, 0],
          scale: [1, 1.2, 0.9, 1],
        }}
        transition={{
          duration: 25,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      <motion.div
        className="absolute -bottom-40 -right-40 w-[500px] h-[500px] rounded-full blur-3xl opacity-20"
        style={{
          background: "radial-gradient(circle, oklch(0.6 0.22 280), transparent)",
        }}
        animate={{
          x: [0, -80, 60, 0],
          y: [0, -60, 80, 0],
          scale: [1, 1.3, 0.8, 1],
        }}
        transition={{
          duration: 30,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      <motion.div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full blur-3xl opacity-15"
        style={{
          background: "radial-gradient(circle, oklch(0.7 0.18 290), transparent)",
        }}
        animate={{
          x: [0, 60, -40, 0],
          y: [0, -40, 60, 0],
          scale: [1, 1.1, 0.9, 1],
        }}
        transition={{
          duration: 35,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* Particle canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ 
          mixBlendMode: "screen",
          willChange: "transform",
        }}
      />

      {/* Gradient overlay for better content readability */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 100% 50% at 50% 0%, transparent 0%, oklch(0.99 0.006 90 / 0.4) 100%)",
        }}
      />
    </div>
  )
}
