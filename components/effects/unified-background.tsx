"use client"

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react"
import { useTheme } from "next-themes"
import { motion } from "framer-motion"
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

function useHasMounted() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  )
}

interface UnifiedBackgroundProps {
  className?: string
  particleCount?: number
  showGrain?: boolean
}

export function UnifiedBackground({
  className,
  particleCount = 40,
  showGrain = true,
}: UnifiedBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const particlesRef = useRef<Particle[]>([])
  const animationFrameRef = useRef<number | undefined>(undefined)
  const [mousePos, setMousePos] = useState({ x: 0.5, y: 0.5 })
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 })
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const { resolvedTheme } = useTheme()
  const mounted = useHasMounted()

  const isDark = resolvedTheme === "dark"

  // Check for reduced motion preference
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)")
    const currentValue = mediaQuery.matches
    if (currentValue !== prefersReducedMotion) {
      setPrefersReducedMotion(currentValue)
    }
    const handleChange = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches)
    mediaQuery.addEventListener("change", handleChange)
    return () => mediaQuery.removeEventListener("change", handleChange)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Detect mobile devices
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener("resize", checkMobile)
    return () => window.removeEventListener("resize", checkMobile)
  }, [])

  // Mouse tracking for parallax gradient orbs
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({
        x: e.clientX / window.innerWidth,
        y: e.clientY / window.innerHeight,
      })
    }
    window.addEventListener("mousemove", handleMouseMove, { passive: true })
    return () => window.removeEventListener("mousemove", handleMouseMove)
  }, [])

  // Particle colors based on theme
  const particleColors = useMemo(() => isDark
    ? [
        "rgba(99, 102, 241, 0.6)",  // Indigo
        "rgba(139, 92, 246, 0.5)",  // Violet
        "rgba(168, 85, 247, 0.4)",  // Purple
        "rgba(79, 70, 229, 0.5)",   // Deep indigo
      ]
    : [
        "rgba(99, 102, 241, 0.4)",  // Indigo
        "rgba(139, 92, 246, 0.35)", // Violet
        "rgba(168, 85, 247, 0.3)",  // Purple
        "rgba(79, 70, 229, 0.35)",  // Deep indigo
      ], [isDark])

  // Initialize particles
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || prefersReducedMotion) return

    const resizeCanvas = () => {
      const width = window.innerWidth
      const height = document.documentElement.scrollHeight
      canvas.width = width
      canvas.height = height
      setDimensions({ width, height })

      const adjustedCount = isMobile ? Math.floor(particleCount * 0.5) : particleCount

      particlesRef.current = Array.from({ length: adjustedCount }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        size: Math.random() * 2 + 1,
        speedX: (Math.random() - 0.5) * 0.3,
        speedY: (Math.random() - 0.5) * 0.3,
        opacity: Math.random() * 0.4 + 0.1,
        color: particleColors[Math.floor(Math.random() * particleColors.length)],
      }))
    }

    resizeCanvas()
    window.addEventListener("resize", resizeCanvas)
    return () => window.removeEventListener("resize", resizeCanvas)
  }, [particleCount, isMobile, prefersReducedMotion, particleColors])

  // Animation loop for particles
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || dimensions.width === 0 || prefersReducedMotion) return

    const ctx = canvas.getContext("2d", { alpha: true })
    if (!ctx) return

    let lastTime = performance.now()
    const targetFPS = 30
    const frameInterval = 1000 / targetFPS

    const animate = (currentTime: number) => {
      const deltaTime = currentTime - lastTime

      if (deltaTime >= frameInterval) {
        ctx.clearRect(0, 0, canvas.width, canvas.height)

        particlesRef.current.forEach((particle, index) => {
          // Gentle parallax based on mouse
          const parallaxX = (mousePos.x - 0.5) * 0.5
          const parallaxY = (mousePos.y - 0.5) * 0.5

          particle.x += particle.speedX + parallaxX * 0.02
          particle.y += particle.speedY + parallaxY * 0.02

          // Wrap around edges
          if (particle.x < 0) particle.x = canvas.width
          if (particle.x > canvas.width) particle.x = 0
          if (particle.y < 0) particle.y = canvas.height
          if (particle.y > canvas.height) particle.y = 0

          // Draw particle with glow
          const gradient = ctx.createRadialGradient(
            particle.x, particle.y, 0,
            particle.x, particle.y, particle.size * 3
          )
          gradient.addColorStop(0, particle.color)
          gradient.addColorStop(1, "transparent")

          ctx.beginPath()
          ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2)
          ctx.fillStyle = gradient
          ctx.globalAlpha = particle.opacity
          ctx.fill()

          // Draw connections to nearby particles
          for (let i = index + 1; i < particlesRef.current.length; i++) {
            const other = particlesRef.current[i]
            const dx = particle.x - other.x
            const dy = particle.y - other.y
            const distance = Math.sqrt(dx * dx + dy * dy)

            if (distance < 120) {
              ctx.beginPath()
              ctx.moveTo(particle.x, particle.y)
              ctx.lineTo(other.x, other.y)
              ctx.strokeStyle = particle.color
              ctx.globalAlpha = (1 - distance / 120) * 0.1
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
  }, [dimensions, mousePos, prefersReducedMotion])

  if (!mounted) {
    return (
      <div className={cn("fixed inset-0 -z-20", className)} aria-hidden="true">
        <div className="absolute inset-0 bg-white dark:bg-black" />
      </div>
    )
  }

  return (
    <div className={cn("fixed inset-0 -z-20 overflow-hidden", className)} aria-hidden="true">
      {/* Base gradient */}
      <div
        className={cn(
          "absolute inset-0 transition-colors duration-700",
          isDark
            ? "bg-linear-to-br from-slate-950 via-slate-900 to-indigo-950"
            : "bg-linear-to-br from-white via-slate-50/80 to-indigo-50/50"
        )}
      />

      {/* Animated gradient orbs with mouse parallax */}
      <motion.div
        className={cn(
          "absolute w-[800px] h-[800px] rounded-full blur-[150px]",
          isDark ? "bg-indigo-600/15" : "bg-indigo-300/30"
        )}
        animate={{
          x: mousePos.x * 80 - 40,
          y: mousePos.y * 80 - 40,
        }}
        transition={{ type: "spring", stiffness: 30, damping: 20 }}
        style={{ top: "5%", left: "10%" }}
      />

      <motion.div
        className={cn(
          "absolute w-[600px] h-[600px] rounded-full blur-[120px]",
          isDark ? "bg-violet-600/12" : "bg-violet-300/25"
        )}
        animate={{
          x: mousePos.x * -60 + 30,
          y: mousePos.y * -60 + 30,
        }}
        transition={{ type: "spring", stiffness: 25, damping: 18 }}
        style={{ top: "35%", right: "5%" }}
      />

      <motion.div
        className={cn(
          "absolute w-[500px] h-[500px] rounded-full blur-[100px]",
          isDark ? "bg-purple-600/10" : "bg-purple-300/20"
        )}
        animate={{
          x: mousePos.x * 50 - 25,
          y: mousePos.y * 50 - 25,
        }}
        transition={{ type: "spring", stiffness: 35, damping: 22 }}
        style={{ bottom: "10%", left: "25%" }}
      />

      {/* Additional floating orb for depth */}
      <motion.div
        className={cn(
          "absolute w-[400px] h-[400px] rounded-full blur-[80px]",
          isDark ? "bg-cyan-600/8" : "bg-cyan-300/15"
        )}
        animate={{
          x: [0, 30, -20, 0],
          y: [0, -20, 30, 0],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        style={{ top: "60%", right: "30%" }}
      />

      {/* Particle canvas */}
      {!prefersReducedMotion && (
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full pointer-events-none"
          style={{
            height: "100%",
            minHeight: "100vh",
          }}
        />
      )}

      {/* Grain texture overlay */}
      {showGrain && (
        <div
          className={cn(
            "absolute inset-0 pointer-events-none",
            isDark ? "opacity-[0.03]" : "opacity-[0.02]"
          )}
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
            backgroundRepeat: "repeat",
          }}
        />
      )}

      {/* Subtle vignette for depth */}
      <div
        className={cn(
          "absolute inset-0 pointer-events-none",
          isDark
            ? "bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(0,0,0,0.3)_100%)]"
            : "bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(0,0,0,0.05)_100%)]"
        )}
      />
    </div>
  )
}
