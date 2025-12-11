"use client"

import { useEffect, useRef } from "react"
import { useTheme } from "next-themes"

export function AnimatedBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { theme } = useTheme()

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Set canvas size
    const resizeCanvas = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resizeCanvas()
    window.addEventListener("resize", resizeCanvas)

    // Particle system
    const particles: Array<{
      x: number
      y: number
      vx: number
      vy: number
      size: number
      opacity: number
    }> = []

    const particleCount = 80

    // Initialize particles
    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        size: Math.random() * 2 + 1,
        opacity: Math.random() * 0.5 + 0.2,
      })
    }

    // Animation loop
    let animationId: number
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Draw gradient background
      const isDark = theme === "dark"

      const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height)
      if (isDark) {
        gradient.addColorStop(0, "#0a0a1f")
        gradient.addColorStop(0.3, "#1a1a3e")
        gradient.addColorStop(0.6, "#2a1a4a")
        gradient.addColorStop(1, "#1a1a2e")
      } else {
        gradient.addColorStop(0, "#f8fafc")
        gradient.addColorStop(0.5, "#e0e7ff")
        gradient.addColorStop(1, "#f1f5f9")
      }

      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Draw particles
      particles.forEach((particle, i) => {
        // Update position
        particle.x += particle.vx
        particle.y += particle.vy

        // Wrap around edges
        if (particle.x < 0) particle.x = canvas.width
        if (particle.x > canvas.width) particle.x = 0
        if (particle.y < 0) particle.y = canvas.height
        if (particle.y > canvas.height) particle.y = 0

        // Draw particle
        ctx.beginPath()
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2)
        ctx.fillStyle = isDark
          ? `rgba(139, 92, 246, ${particle.opacity})`
          : `rgba(99, 102, 241, ${particle.opacity * 0.6})`
        ctx.fill()

        // Draw connections
        particles.slice(i + 1).forEach((otherParticle) => {
          const dx = particle.x - otherParticle.x
          const dy = particle.y - otherParticle.y
          const distance = Math.sqrt(dx * dx + dy * dy)

          if (distance < 150) {
            ctx.beginPath()
            ctx.moveTo(particle.x, particle.y)
            ctx.lineTo(otherParticle.x, otherParticle.y)
            const opacity = (1 - distance / 150) * 0.3 * particle.opacity
            ctx.strokeStyle = isDark ? `rgba(139, 92, 246, ${opacity})` : `rgba(99, 102, 241, ${opacity * 0.5})`
            ctx.lineWidth = 0.5
            ctx.stroke()
          }
        })
      })

      animationId = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      window.removeEventListener("resize", resizeCanvas)
      cancelAnimationFrame(animationId)
    }
  }, [theme])

  return (
    <canvas ref={canvasRef} className="fixed inset-0 -z-10 pointer-events-none" style={{ background: "transparent" }} />
  )
}
