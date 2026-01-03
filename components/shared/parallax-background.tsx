"use client"

import { useEffect, useState, useRef } from "react"
import { cn } from "@/lib/utils"

// Noise texture SVG as a constant for maintainability
const NOISE_TEXTURE_SVG = `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`

interface ParallaxBackgroundProps {
  className?: string
  /** Enable animated gradient orbs */
  enableOrbs?: boolean
  /** Enable grid pattern overlay */
  enableGrid?: boolean
  /** Enable noise texture overlay */
  enableNoise?: boolean
  /** Parallax intensity (0-1) */
  intensity?: number
}

/**
 * Premium Parallax Background
 * Provides seamless scrolling background with gradient orbs and subtle patterns
 * Works in both light and dark mode
 */
export function ParallaxBackground({
  className,
  enableOrbs = true,
  enableGrid = true,
  enableNoise = true,
  intensity = 0.3,
}: ParallaxBackgroundProps) {
  const [scrollY, setScrollY] = useState(0)
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY)
    }

    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({
        x: (e.clientX / window.innerWidth - 0.5) * 2,
        y: (e.clientY / window.innerHeight - 0.5) * 2,
      })
    }

    window.addEventListener("scroll", handleScroll, { passive: true })
    window.addEventListener("mousemove", handleMouseMove, { passive: true })

    return () => {
      window.removeEventListener("scroll", handleScroll)
      window.removeEventListener("mousemove", handleMouseMove)
    }
  }, [])

  const parallaxOffset = scrollY * intensity

  return (
    <div
      ref={containerRef}
      className={cn(
        "fixed inset-0 -z-10 overflow-hidden pointer-events-none",
        className
      )}
      aria-hidden="true"
    >
      {/* Base gradient - light/dark mode aware */}
      <div
        className="absolute inset-0 transition-colors duration-500"
        style={{
          background: `
            radial-gradient(ellipse 80% 50% at 50% -20%, var(--gradient-orb-1, rgba(99, 102, 241, 0.08)) 0%, transparent 50%),
            radial-gradient(ellipse 60% 40% at 80% 80%, var(--gradient-orb-2, rgba(139, 92, 246, 0.06)) 0%, transparent 50%),
            var(--background)
          `,
        }}
      />

      {/* Animated gradient orbs with parallax */}
      {enableOrbs && (
        <>
          {/* Primary orb - top left */}
          <div
            className="absolute w-[600px] h-[600px] rounded-full blur-[120px] opacity-40 dark:opacity-20 transition-opacity duration-500"
            style={{
              background: "linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)",
              top: -200 - parallaxOffset * 0.5,
              left: -100 + mousePosition.x * 20,
              transform: `translate3d(0, ${parallaxOffset * 0.3}px, 0)`,
            }}
          />

          {/* Secondary orb - bottom right */}
          <div
            className="absolute w-[500px] h-[500px] rounded-full blur-[100px] opacity-30 dark:opacity-15 transition-opacity duration-500"
            style={{
              background: "linear-gradient(225deg, var(--accent) 0%, var(--primary) 100%)",
              bottom: -150 + parallaxOffset * 0.3,
              right: -100 - mousePosition.x * 15,
              transform: `translate3d(0, ${-parallaxOffset * 0.2}px, 0)`,
            }}
          />

          {/* Tertiary orb - center */}
          <div
            className="absolute w-[400px] h-[400px] rounded-full blur-[80px] opacity-20 dark:opacity-10 transition-opacity duration-500"
            style={{
              background: "radial-gradient(circle, var(--primary) 0%, transparent 70%)",
              top: "40%",
              left: "50%",
              transform: `translate3d(${mousePosition.x * 30}px, ${parallaxOffset * 0.1 + mousePosition.y * 20}px, 0)`,
            }}
          />
        </>
      )}

      {/* Subtle grid pattern */}
      {enableGrid && (
        <div
          className="absolute inset-0 opacity-[0.02] dark:opacity-[0.04] transition-opacity duration-500"
          style={{
            backgroundImage: `
              linear-gradient(var(--foreground) 1px, transparent 1px),
              linear-gradient(90deg, var(--foreground) 1px, transparent 1px)
            `,
            backgroundSize: "60px 60px",
            transform: `translate3d(0, ${parallaxOffset * 0.1}px, 0)`,
          }}
        />
      )}

      {/* Noise texture overlay */}
      {enableNoise && (
        <div
          className="absolute inset-0 opacity-[0.015] dark:opacity-[0.03] mix-blend-overlay transition-opacity duration-500"
          style={{
            backgroundImage: NOISE_TEXTURE_SVG,
          }}
        />
      )}

      {/* Gradient fade at top for navbar blend */}
      <div
        className="absolute top-0 left-0 right-0 h-32 pointer-events-none"
        style={{
          background: "linear-gradient(to bottom, var(--background) 0%, transparent 100%)",
        }}
      />

      {/* Gradient fade at bottom */}
      <div
        className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none"
        style={{
          background: "linear-gradient(to top, var(--background) 0%, transparent 100%)",
        }}
      />
    </div>
  )
}

/**
 * Section-specific parallax wrapper
 * Use this to wrap individual sections for consistent parallax effect
 */
export function ParallaxSection({
  children,
  className,
  speed = 0.5,
}: {
  children: React.ReactNode
  className?: string
  speed?: number
}) {
  const [offset, setOffset] = useState(0)
  const sectionRef = useRef<HTMLDivElement>(null)
  const lastScrollTime = useRef(0)

  useEffect(() => {
    const handleScroll = () => {
      // Throttle to ~60fps
      const now = Date.now()
      if (now - lastScrollTime.current < 16) return
      lastScrollTime.current = now

      if (!sectionRef.current) return
      const rect = sectionRef.current.getBoundingClientRect()
      const scrollProgress = (window.innerHeight - rect.top) / (window.innerHeight + rect.height)
      setOffset(scrollProgress * 100 * speed)
    }

    window.addEventListener("scroll", handleScroll, { passive: true })
    handleScroll()

    return () => window.removeEventListener("scroll", handleScroll)
  }, [speed])

  return (
    <div
      ref={sectionRef}
      className={cn("relative", className)}
      style={{
        transform: `translate3d(0, ${offset}px, 0)`,
      }}
    >
      {children}
    </div>
  )
}

export default ParallaxBackground
