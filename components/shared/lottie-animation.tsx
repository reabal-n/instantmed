"use client"

import { useEffect, useRef } from "react"
import type { AnimationItem } from "lottie-web"

interface LottieAnimationProps {
  animationData: object
  loop?: boolean
  autoplay?: boolean
  className?: string
  speed?: number
}

export function LottieAnimation({
  animationData,
  loop = true,
  autoplay = true,
  className = "",
  speed = 1,
}: LottieAnimationProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const animationRef = useRef<AnimationItem | null>(null)

  useEffect(() => {
    if (!containerRef.current) return

    let cancelled = false

    import("lottie-web").then((lottieModule) => {
      if (cancelled || !containerRef.current) return
      const lottie = lottieModule.default

      animationRef.current = lottie.loadAnimation({
        container: containerRef.current,
        renderer: "svg",
        loop,
        autoplay,
        animationData,
      })

      animationRef.current.setSpeed(speed)
    })

    return () => {
      cancelled = true
      animationRef.current?.destroy()
    }
  }, [animationData, loop, autoplay, speed])

  return <div ref={containerRef} className={className} />
}
