"use client"

import { useEffect, useRef } from "react"
import type { AnimationItem } from "lottie-web"
import { cn } from "@/lib/utils"
import { useReducedMotion } from "framer-motion"

type AnimationName =
  | "confetti"
  | "empty-state"
  | "error"
  | "loading-files"
  | "loading"
  | "notification"
  | "success"

const fileMap: Record<AnimationName, string> = {
  confetti: "/animations/Confetti.json",
  "empty-state": "/animations/Empty State.json",
  error: "/animations/Error.json",
  "loading-files": "/animations/Loading Files.json",
  loading: "/animations/Loading.json",
  notification: "/animations/Notification.json",
  success: "/animations/Success.json",
}

interface LottieAnimationProps {
  name: AnimationName
  loop?: boolean
  autoplay?: boolean
  className?: string
  size?: number
}

export function LottieAnimation({
  name,
  loop = true,
  autoplay = true,
  className,
  size = 120,
}: LottieAnimationProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const animationRef = useRef<AnimationItem | null>(null)
  const prefersReducedMotion = useReducedMotion()

  useEffect(() => {
    if (!containerRef.current || prefersReducedMotion) return

    let cancelled = false
    import("lottie-web").then((mod) => {
      if (cancelled || !containerRef.current) return
      animationRef.current = mod.default.loadAnimation({
        container: containerRef.current,
        renderer: "svg",
        loop,
        autoplay,
        path: fileMap[name],
      })
    })

    return () => {
      cancelled = true
      animationRef.current?.destroy()
    }
  }, [name, loop, autoplay, prefersReducedMotion])

  // For reduced motion, show a static placeholder
  if (prefersReducedMotion) {
    return (
      <div
        className={cn("flex items-center justify-center", className)}
        style={{ width: size, height: size }}
      />
    )
  }

  return (
    <div
      ref={containerRef}
      className={cn("flex items-center justify-center", className)}
      style={{ width: size, height: size }}
    />
  )
}
