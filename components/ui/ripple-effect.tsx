"use client"

import React, { useState, useLayoutEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"

interface RippleEffectProps {
  children: React.ReactNode
  className?: string
  duration?: number
  color?: string
  enabled?: boolean
}

interface Ripple {
  id: number
  x: number
  y: number
  size: number
}

export function RippleEffect({
  children,
  className,
  duration = 800,
  color = "rgba(255, 255, 255, 0.3)",
  enabled = true,
}: RippleEffectProps) {
  const [ripples, setRipples] = useState<Ripple[]>([])
  const containerRef = React.useRef<HTMLDivElement>(null)

  const addRipple = (event: React.MouseEvent<HTMLElement>) => {
    if (!enabled || !containerRef.current) return

    const containerRect = containerRef.current.getBoundingClientRect()
    const size = Math.max(containerRect.width, containerRect.height)
    const x = event.clientX - containerRect.left - size / 2
    const y = event.clientY - containerRect.top - size / 2

    const newRipple: Ripple = {
      id: Date.now(),
      x,
      y,
      size,
    }

    setRipples((prevRipples) => [...prevRipples, newRipple])
  }

  useLayoutEffect(() => {
    if (ripples.length > 0) {
      const timer = setTimeout(() => {
        setRipples((prevRipples) => prevRipples.slice(1))
      }, duration)
      return () => clearTimeout(timer)
    }
  }, [ripples, duration])

  return (
    <div
      ref={containerRef}
      className={cn("relative overflow-hidden", className)}
      onMouseDown={addRipple}
    >
      {children}
      <AnimatePresence>
        {ripples.map((ripple) => (
          <motion.span
            key={ripple.id}
            className="absolute rounded-full bg-current pointer-events-none"
            initial={{
              opacity: 0.5,
              scale: 0,
              x: ripple.x,
              y: ripple.y,
              backgroundColor: color,
            }}
            animate={{ opacity: 0, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration, ease: "easeOut" }}
            style={{
              width: ripple.size,
              height: ripple.size,
            }}
          />
        ))}
      </AnimatePresence>
    </div>
  )
}
