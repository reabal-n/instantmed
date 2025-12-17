"use client"

import { useEffect, useRef, useState } from "react"
import { useInView, useSpring, useTransform, MotionValue } from "framer-motion"

interface UseSmoothScrollOptions {
  offset?: number
  threshold?: number
  once?: boolean
}

export function useSmoothScroll(options: UseSmoothScrollOptions = {}) {
  const { offset = 100, threshold = 0.1, once = true } = options
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once, margin: `-${offset}px` as `${number}px` })

  return { ref, isInView }
}

// Hook for parallax scroll effect
export function useParallax(value: MotionValue<number>, distance: number) {
  return useTransform(value, [0, 1], [-distance, distance])
}

// Hook for smooth scroll progress
export function useScrollProgress() {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const updateProgress = () => {
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight
      const scrolled = window.scrollY
      setProgress(scrolled / scrollHeight)
    }

    window.addEventListener("scroll", updateProgress, { passive: true })
    return () => window.removeEventListener("scroll", updateProgress)
  }, [])

  return progress
}

// Hook for smooth mouse position with lerp
export function useSmoothMouse(lerp = 0.1) {
  const [smoothPosition, setSmoothPosition] = useState({ x: 0, y: 0 })
  const mousePosition = useRef({ x: 0, y: 0 })
  const animationFrame = useRef<number>(null)

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mousePosition.current = { x: e.clientX, y: e.clientY }
    }

    const animate = () => {
      setSmoothPosition((prev) => ({
        x: prev.x + (mousePosition.current.x - prev.x) * lerp,
        y: prev.y + (mousePosition.current.y - prev.y) * lerp,
      }))
      animationFrame.current = requestAnimationFrame(animate)
    }

    window.addEventListener("mousemove", handleMouseMove)
    animationFrame.current = requestAnimationFrame(animate)

    return () => {
      window.removeEventListener("mousemove", handleMouseMove)
      if (animationFrame.current) {
        cancelAnimationFrame(animationFrame.current)
      }
    }
  }, [lerp])

  return smoothPosition
}

// Hook for element position relative to mouse
export function useMouseRelative(ref: React.RefObject<HTMLElement>) {
  const [relative, setRelative] = useState({ x: 0, y: 0, centerX: 0, centerY: 0 })

  useEffect(() => {
    const element = ref.current
    if (!element) return

    const handleMouseMove = (e: MouseEvent) => {
      const rect = element.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      const centerX = (x / rect.width - 0.5) * 2 // -1 to 1
      const centerY = (y / rect.height - 0.5) * 2 // -1 to 1

      setRelative({ x, y, centerX, centerY })
    }

    element.addEventListener("mousemove", handleMouseMove)
    return () => element.removeEventListener("mousemove", handleMouseMove)
  }, [ref])

  return relative
}
