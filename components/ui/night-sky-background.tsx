"use client"

import { useEffect, useState, useMemo } from "react"
import { cn } from "@/lib/utils"
import { motion } from "framer-motion"

interface Star {
  id: number
  x: number
  y: number
  size: number
  opacity: number
  twinkleDelay: number
  twinkleDuration: number
}

interface NightSkyBackgroundProps {
  className?: string
  /** Number of stars to render */
  starCount?: number
  /** Show shooting stars occasionally */
  showShootingStars?: boolean
}

/**
 * NightSkyBackground - Calm, quiet night sky with subtle vibrant stars
 * Only renders in dark mode for a peaceful nighttime experience
 */
export function NightSkyBackground({
  className,
  starCount = 80,
  showShootingStars = true,
}: NightSkyBackgroundProps) {
  const [mounted, setMounted] = useState(false)
  const [shootingStar, setShootingStar] = useState<{ x: number; y: number } | null>(null)
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    setMounted(true)
    // Reduce star count on mobile for performance
    setIsMobile(window.innerWidth < 768)
  }, [])

  // Check for reduced motion preference (separate effect to avoid cascading renders)
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    // Only update if different from current state
    if (mediaQuery.matches !== prefersReducedMotion) {
      setPrefersReducedMotion(mediaQuery.matches)
    }
    
    const handleChange = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches)
    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [prefersReducedMotion])

  // Generate stars deterministically based on count (reduced on mobile for performance)
  const effectiveStarCount = isMobile ? Math.min(starCount, 40) : starCount
  const stars = useMemo<Star[]>(() => {
    if (!mounted) return []
    
    const generatedStars: Star[] = []
    for (let i = 0; i < effectiveStarCount; i++) {
      // Use seeded pseudo-random for consistent star placement
      const seed = i * 9301 + 49297
      const rand = () => ((seed * (i + 1)) % 233280) / 233280
      
      generatedStars.push({
        id: i,
        x: (rand() * 100),
        y: (rand() * 100 * 1.5) % 100,
        size: 1 + rand() * 2,
        opacity: 0.3 + rand() * 0.7,
        twinkleDelay: rand() * 5,
        twinkleDuration: 3 + rand() * 4,
      })
    }
    return generatedStars
  }, [mounted, effectiveStarCount])

  // Occasional shooting star (disabled for reduced motion)
  useEffect(() => {
    if (!showShootingStars || prefersReducedMotion) return

    const triggerShootingStar = () => {
      setShootingStar({
        x: Math.random() * 60 + 20,
        y: Math.random() * 40,
      })
      setTimeout(() => setShootingStar(null), 1000)
    }

    // Random interval between 15-45 seconds
    const scheduleNext = () => {
      const delay = 15000 + Math.random() * 30000
      return setTimeout(() => {
        triggerShootingStar()
        scheduleNext()
      }, delay)
    }

    const timeout = scheduleNext()
    return () => clearTimeout(timeout)
  }, [showShootingStars, prefersReducedMotion])

  if (!mounted) return null

  return (
    <div
      className={cn(
        "fixed inset-0 -z-10 overflow-hidden pointer-events-none",
        "opacity-0 dark:opacity-100 transition-opacity duration-700",
        className
      )}
      aria-hidden="true"
    >
      {/* Night sky gradient - deep blue to near-black */}
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(to bottom, 
            #0B1120 0%, 
            #111827 30%, 
            #1A2332 60%, 
            #1E293B 100%
          )`,
        }}
      />

      {/* Subtle aurora/nebula glow - very understated */}
      <div
        className="absolute inset-0 opacity-30"
        style={{
          background: `
            radial-gradient(ellipse 80% 50% at 20% 20%, rgba(99, 102, 241, 0.08) 0%, transparent 50%),
            radial-gradient(ellipse 60% 40% at 80% 60%, rgba(168, 204, 232, 0.06) 0%, transparent 50%),
            radial-gradient(ellipse 70% 50% at 50% 80%, rgba(245, 169, 98, 0.04) 0%, transparent 50%)
          `,
        }}
      />

      {/* Stars layer */}
      <div className="absolute inset-0">
        {stars.map((star) => (
          <motion.div
            key={star.id}
            className="absolute rounded-full"
            style={{
              left: `${star.x}%`,
              top: `${star.y}%`,
              width: star.size,
              height: star.size,
              backgroundColor: star.opacity > 0.7 
                ? `rgba(255, 255, 255, ${star.opacity})` 
                : star.id % 3 === 0 
                  ? `rgba(168, 204, 232, ${star.opacity})` // Sky blue tint
                  : star.id % 5 === 0
                    ? `rgba(249, 201, 146, ${star.opacity * 0.8})` // Warm dawn tint
                    : `rgba(255, 255, 255, ${star.opacity})`,
              boxShadow: star.size > 2 
                ? `0 0 ${star.size * 2}px rgba(255, 255, 255, ${star.opacity * 0.5})` 
                : undefined,
            }}
            animate={prefersReducedMotion ? {} : {
              opacity: [star.opacity, star.opacity * 0.4, star.opacity],
              scale: [1, 1.2, 1],
            }}
            transition={prefersReducedMotion ? {} : {
              duration: star.twinkleDuration,
              delay: star.twinkleDelay,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>

      {/* Shooting star */}
      {shootingStar && (
        <motion.div
          className="absolute h-0.5 bg-linear-to-r from-white via-white to-transparent rounded-full"
          style={{
            left: `${shootingStar.x}%`,
            top: `${shootingStar.y}%`,
            transformOrigin: "left center",
          }}
          initial={{ 
            width: 0, 
            opacity: 0,
            rotate: 35,
          }}
          animate={{ 
            width: [0, 80, 120],
            opacity: [0, 1, 0],
            x: [0, 100, 200],
            y: [0, 50, 100],
          }}
          transition={{
            duration: 1,
            ease: "easeOut",
          }}
        />
      )}

      {/* Soft vignette for depth */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse 100% 100% at 50% 50%, transparent 40%, rgba(11, 17, 32, 0.4) 100%)`,
        }}
      />
    </div>
  )
}
