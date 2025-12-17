"use client"

import { useEffect, useRef, useState } from "react"
import { useTheme } from "next-themes"

interface Particle {
  x: number
  y: number
  z: number
  size: number
  opacity: number
  speedX: number
  speedY: number
  hue: number
}

export function AnimatedGradientBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [mousePos, setMousePos] = useState({ x: 0.5, y: 0.5 })
  const { resolvedTheme } = useTheme()

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({
        x: e.clientX / window.innerWidth,
        y: e.clientY / window.innerHeight,
      })
    }
    window.addEventListener("mousemove", handleMouseMove)
    return () => window.removeEventListener("mousemove", handleMouseMove)
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    let animationId: number
    let time = 0
    const particles: Particle[] = []
    const isDark = resolvedTheme === "dark"
    const numParticles = isDark ? 60 : 40 // Fewer particles in light mode

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }

    const initParticles = () => {
      particles.length = 0
      for (let i = 0; i < numParticles; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          z: Math.random() * 3 + 1,
          size: isDark ? Math.random() * 2.5 + 1 : Math.random() * 2 + 0.5,
          opacity: isDark ? Math.random() * 0.5 + 0.2 : Math.random() * 0.15 + 0.05,
          speedX: (Math.random() - 0.5) * 0.3,
          speedY: (Math.random() - 0.5) * 0.3,
          hue: Math.random() * 60 + 220, // indigo to violet range
        })
      }
    }

    resize()
    initParticles()
    
    const resizeHandler = () => {
      resize()
      initParticles()
    }
    window.addEventListener("resize", resizeHandler)

    const animate = () => {
      time += 0.002

      const width = canvas.width
      const height = canvas.height

      if (isDark) {
        // Dark mode: Deep space gradient
        const gradient = ctx.createRadialGradient(
          width * (0.3 + mousePos.x * 0.4),
          height * (0.3 + mousePos.y * 0.4),
          0,
          width * 0.5,
          height * 0.5,
          Math.max(width, height)
        )
        gradient.addColorStop(0, `hsl(${230 + Math.sin(time) * 5}, 40%, 10%)`)
        gradient.addColorStop(0.4, `hsl(${235 + Math.cos(time * 0.7) * 3}, 35%, 6%)`)
        gradient.addColorStop(1, `hsl(${225}, 25%, 3%)`)
        ctx.fillStyle = gradient
      } else {
        // Light mode: Clean white with subtle warm tint
        const gradient = ctx.createLinearGradient(0, 0, width, height)
        gradient.addColorStop(0, "#fafbff")
        gradient.addColorStop(0.5, "#f8f9fc")
        gradient.addColorStop(1, "#f5f7fa")
        ctx.fillStyle = gradient
      }
      ctx.fillRect(0, 0, width, height)

      // Draw particles with connections
      particles.forEach((particle, i) => {
        // Parallax offset based on mouse position
        const parallaxX = (mousePos.x - 0.5) * 15 * particle.z
        const parallaxY = (mousePos.y - 0.5) * 15 * particle.z

        const x = particle.x + parallaxX
        const y = particle.y + parallaxY

        // Floating animation - slower and more subtle
        const floatX = Math.sin(time * 1.5 + particle.hue) * 1.5
        const floatY = Math.cos(time * 1.5 + particle.x * 0.01) * 1.5

        const finalX = x + floatX
        const finalY = y + floatY

        // Draw particle
        ctx.beginPath()
        ctx.arc(finalX, finalY, particle.size, 0, Math.PI * 2)
        
        if (isDark) {
          ctx.fillStyle = `hsla(${particle.hue}, 70%, 70%, ${particle.opacity})`
        } else {
          // Light mode: very subtle indigo dots
          ctx.fillStyle = `hsla(${particle.hue}, 40%, 70%, ${particle.opacity})`
        }
        ctx.fill()

        // Draw connections to nearby particles (only in dark mode for cleaner light mode)
        if (isDark) {
          particles.slice(i + 1).forEach((other) => {
            const otherX = other.x + (mousePos.x - 0.5) * 15 * other.z + Math.sin(time * 1.5 + other.hue) * 1.5
            const otherY = other.y + (mousePos.y - 0.5) * 15 * other.z + Math.cos(time * 1.5 + other.x * 0.01) * 1.5
            
            const dx = finalX - otherX
            const dy = finalY - otherY
            const distance = Math.sqrt(dx * dx + dy * dy)

            if (distance < 120) {
              ctx.beginPath()
              ctx.moveTo(finalX, finalY)
              ctx.lineTo(otherX, otherY)
              const lineOpacity = (1 - distance / 120) * 0.12
              ctx.strokeStyle = `rgba(139, 92, 246, ${lineOpacity})`
              ctx.lineWidth = 0.5
              ctx.stroke()
            }
          })
        }

        // Move particle
        particle.x += particle.speedX
        particle.y += particle.speedY

        // Wrap around edges
        if (particle.x < -20) particle.x = width + 20
        if (particle.x > width + 20) particle.x = -20
        if (particle.y < -20) particle.y = height + 20
        if (particle.y > height + 20) particle.y = -20
      })

      // Subtle glow effect (dark mode only)
      if (isDark) {
        ctx.globalCompositeOperation = "screen"
        const glowGradient = ctx.createRadialGradient(
          width * (0.6 + Math.sin(time * 0.3) * 0.15),
          height * (0.4 + Math.cos(time * 0.4) * 0.15),
          0,
          width * 0.5,
          height * 0.5,
          width * 0.4
        )
        glowGradient.addColorStop(0, `rgba(99, 102, 241, ${0.03 + Math.sin(time) * 0.01})`)
        glowGradient.addColorStop(0.5, `rgba(139, 92, 246, ${0.015 + Math.cos(time * 0.7) * 0.005})`)
        glowGradient.addColorStop(1, "transparent")
        ctx.fillStyle = glowGradient
        ctx.fillRect(0, 0, width, height)
        ctx.globalCompositeOperation = "source-over"
      }

      animationId = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      window.removeEventListener("resize", resizeHandler)
      cancelAnimationFrame(animationId)
    }
  }, [mousePos, resolvedTheme])

  return (
    <>
      {/* Animated particle canvas */}
      <canvas
        ref={canvasRef}
        className="fixed inset-0 -z-20 pointer-events-none"
        aria-hidden="true"
      />
      {/* Grain overlay for texture */}
      <div
        className="fixed inset-0 -z-10 pointer-events-none opacity-[0.03] dark:opacity-[0.08]"
        aria-hidden="true"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />
    </>
  )
}
