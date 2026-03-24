"use client"

import { useEffect, useState, useCallback } from "react"
import { useReducedMotion } from "framer-motion"

interface Particle {
  id: number
  x: number
  y: number
  angle: number
  speed: number
  size: number
  color: string
  rotation: number
  rotationSpeed: number
}

const COLORS = [
  "#3B82F6", // primary blue
  "#22C55E", // success green
  "#F59E0B", // amber
  "#8B5CF6", // violet
  "#EC4899", // pink
  "#06B6D4", // cyan
]

interface ConfettiBurstProps {
  /** Trigger the burst */
  trigger?: boolean
  /** Number of particles */
  count?: number
  /** Duration in ms */
  duration?: number
  className?: string
}

/**
 * Confetti burst animation for celebration moments.
 * Use on success/payment pages for a moment of delight.
 * Respects reduced motion preference.
 */
export function ConfettiBurst({
  trigger = true,
  count = 40,
  duration = 2500,
  className,
}: ConfettiBurstProps) {
  const prefersReducedMotion = useReducedMotion()
  const [particles, setParticles] = useState<Particle[]>([])
  const [isActive, setIsActive] = useState(false)

  const burst = useCallback(() => {
    if (prefersReducedMotion) return

    const newParticles: Particle[] = Array.from({ length: count }, (_, i) => ({
      id: i,
      x: 50, // Start from center
      y: 50,
      angle: (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5,
      speed: 2 + Math.random() * 4,
      size: 4 + Math.random() * 6,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 10,
    }))

    setParticles(newParticles)
    setIsActive(true)

    setTimeout(() => {
      setIsActive(false)
      setParticles([])
    }, duration)
  }, [count, duration, prefersReducedMotion])

  useEffect(() => {
    if (trigger) burst()
  }, [trigger, burst])

  if (!isActive || prefersReducedMotion) return null

  return (
    <div
      className={`fixed inset-0 pointer-events-none z-50 overflow-hidden ${className || ""}`}
      aria-hidden="true"
    >
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            borderRadius: Math.random() > 0.5 ? "50%" : "2px",
            transform: `rotate(${p.rotation}deg)`,
            animation: `confetti-fall ${duration}ms ease-out forwards`,
            animationDelay: `${Math.random() * 200}ms`,
            // Use CSS custom properties for per-particle physics
            "--confetti-x": `${Math.cos(p.angle) * p.speed * 15}vw`,
            "--confetti-y": `${Math.sin(p.angle) * p.speed * -10}vh`,
            "--confetti-rotate": `${p.rotation + p.rotationSpeed * 50}deg`,
          } as React.CSSProperties}
        />
      ))}
      <style>{`
        @keyframes confetti-fall {
          0% {
            transform: translate(0, 0) rotate(0deg);
            opacity: 1;
          }
          30% {
            transform: translate(var(--confetti-x), var(--confetti-y)) rotate(var(--confetti-rotate));
            opacity: 1;
          }
          100% {
            transform: translate(var(--confetti-x), calc(var(--confetti-y) + 80vh)) rotate(var(--confetti-rotate));
            opacity: 0;
          }
        }
      `}</style>
    </div>
  )
}
