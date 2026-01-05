"use client"

import { useRef, useEffect, ReactNode } from "react"
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion"
import { cn } from "@/lib/utils"

interface GradientMeshProps {
  children?: ReactNode
  className?: string
  interactive?: boolean
  colors?: string[]
  speed?: number
  blur?: number
}

// Phantom-style animated gradient mesh background
export function GradientMesh({
  children,
  className,
  interactive = true,
  colors = ["#2563EB", "#4f46e5", "#4f46e5", "#EC4899"],
  speed = 20,
  blur = 100,
}: GradientMeshProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mouseX = useMotionValue(0.5)
  const mouseY = useMotionValue(0.5)

  const smoothX = useSpring(mouseX, { stiffness: 50, damping: 20 })
  const smoothY = useSpring(mouseY, { stiffness: 50, damping: 20 })

  useEffect(() => {
    if (!interactive) return

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      mouseX.set((e.clientX - rect.left) / rect.width)
      mouseY.set((e.clientY - rect.top) / rect.height)
    }

    window.addEventListener("mousemove", handleMouseMove)
    return () => window.removeEventListener("mousemove", handleMouseMove)
  }, [interactive, mouseX, mouseY])

  // Transform mouse position to blob positions
  const blob1X = useTransform(smoothX, [0, 1], ["20%", "40%"])
  const blob1Y = useTransform(smoothY, [0, 1], ["20%", "40%"])
  const blob2X = useTransform(smoothX, [0, 1], ["60%", "80%"])
  const blob2Y = useTransform(smoothY, [0, 1], ["60%", "40%"])
  const blob3X = useTransform(smoothX, [0, 1], ["40%", "20%"])
  const blob3Y = useTransform(smoothY, [0, 1], ["80%", "60%"])

  return (
    <div ref={containerRef} className={cn("relative overflow-hidden", className)}>
      {/* Gradient blobs */}
      <div className="absolute inset-0">
        {/* Blob 1 */}
        <motion.div
          className="absolute w-[50%] aspect-square rounded-full"
          style={{
            left: blob1X,
            top: blob1Y,
            background: `radial-gradient(circle, ${colors[0]}40, transparent 70%)`,
            filter: `blur(${blur}px)`,
            transform: "translate(-50%, -50%)",
          }}
          animate={
            !interactive
              ? {
                  x: [0, 100, 0],
                  y: [0, -50, 0],
                  scale: [1, 1.2, 1],
                }
              : undefined
          }
          transition={{
            duration: speed,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        {/* Blob 2 */}
        <motion.div
          className="absolute w-[60%] aspect-square rounded-full"
          style={{
            left: blob2X,
            top: blob2Y,
            background: `radial-gradient(circle, ${colors[1]}40, transparent 70%)`,
            filter: `blur(${blur}px)`,
            transform: "translate(-50%, -50%)",
          }}
          animate={
            !interactive
              ? {
                  x: [0, -80, 0],
                  y: [0, 60, 0],
                  scale: [1.2, 1, 1.2],
                }
              : undefined
          }
          transition={{
            duration: speed * 1.2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        {/* Blob 3 */}
        <motion.div
          className="absolute w-[45%] aspect-square rounded-full"
          style={{
            left: blob3X,
            top: blob3Y,
            background: `radial-gradient(circle, ${colors[2]}40, transparent 70%)`,
            filter: `blur(${blur}px)`,
            transform: "translate(-50%, -50%)",
          }}
          animate={
            !interactive
              ? {
                  x: [0, 60, -40, 0],
                  y: [0, -40, 80, 0],
                  scale: [1, 1.3, 0.9, 1],
                }
              : undefined
          }
          transition={{
            duration: speed * 1.5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        {/* Blob 4 */}
        <motion.div
          className="absolute w-[40%] aspect-square rounded-full"
          style={{
            left: "70%",
            top: "30%",
            background: `radial-gradient(circle, ${colors[3] || colors[0]}30, transparent 70%)`,
            filter: `blur(${blur}px)`,
            transform: "translate(-50%, -50%)",
          }}
          animate={{
            x: [0, -40, 20, 0],
            y: [0, 60, -30, 0],
            scale: [1.1, 0.9, 1.2, 1.1],
          }}
          transition={{
            duration: speed * 1.3,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </div>

      {/* Content */}
      {children && <div className="relative z-10">{children}</div>}
    </div>
  )
}

// Animated gradient border effect
interface GradientBorderProps {
  children: ReactNode
  className?: string
  borderWidth?: number
  borderRadius?: number
  colors?: string[]
  animationDuration?: number
}

export function GradientBorder({
  children,
  className,
  borderWidth = 2,
  borderRadius = 16,
  colors = ["#2563EB", "#4f46e5", "#4f46e5", "#EC4899", "#2563EB"],
  animationDuration = 3,
}: GradientBorderProps) {
  return (
    <div className={cn("relative", className)} style={{ padding: borderWidth }}>
      {/* Animated gradient border */}
      {(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const animateProps = { "--gradient-angle": ["0deg", "360deg"] } as any
        return (
          <motion.div
            className="absolute inset-0"
            style={{
              borderRadius,
              background: `linear-gradient(var(--gradient-angle), ${colors.join(", ")})`,
              // @ts-expect-error -- Framer Motion custom CSS properties for animation
              "--gradient-angle": "0deg",
            }}
            animate={animateProps}
            transition={{
              duration: animationDuration,
              repeat: Infinity,
              ease: "linear",
            }}
          />
        )
      })()}

      {/* Inner content container */}
      <div
        className="relative bg-background"
        style={{ borderRadius: borderRadius - borderWidth }}
      >
        {children}
      </div>
    </div>
  )
}

// Noise texture overlay for grain effect
export function NoiseOverlay({ opacity = 0.03 }: { opacity?: number }) {
  return (
    <div
      className="pointer-events-none absolute inset-0 z-50"
      style={{
        opacity,
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
      }}
    />
  )
}
