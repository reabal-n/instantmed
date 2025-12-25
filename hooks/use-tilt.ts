"use client"

import { useRef, useState, useCallback } from "react"

interface TiltState {
  rotateX: number
  rotateY: number
  scale: number
}

interface UseTiltOptions {
  max?: number
  scale?: number
  speed?: number
  perspective?: number
}

export function useTilt(options: UseTiltOptions = {}) {
  const { max = 15, scale = 1.02, speed = 400, perspective = 1000 } = options
  
  const tiltRef = useRef<HTMLDivElement>(null)
  const [tilt, setTilt] = useState<TiltState>({ rotateX: 0, rotateY: 0, scale: 1 })
  const [isHovering, setIsHovering] = useState(false)

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!tiltRef.current) return
    
    const rect = tiltRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const centerX = rect.width / 2
    const centerY = rect.height / 2
    
    const rotateX = ((y - centerY) / centerY) * -max
    const rotateY = ((x - centerX) / centerX) * max
    
    setTilt({ rotateX, rotateY, scale })
  }, [max, scale])

  const handleMouseEnter = useCallback(() => {
    setIsHovering(true)
  }, [])

  const handleMouseLeave = useCallback(() => {
    setIsHovering(false)
    setTilt({ rotateX: 0, rotateY: 0, scale: 1 })
  }, [])

  const style: React.CSSProperties = {
    transform: `perspective(${perspective}px) rotateX(${tilt.rotateX}deg) rotateY(${tilt.rotateY}deg) scale(${tilt.scale})`,
    transition: isHovering ? `transform ${speed / 4}ms ease-out` : `transform ${speed}ms ease-out`,
    transformStyle: "preserve-3d" as const,
  }

  return {
    tiltRef,
    style,
    tilt,
    isHovering,
    handlers: {
      onMouseMove: handleMouseMove,
      onMouseEnter: handleMouseEnter,
      onMouseLeave: handleMouseLeave,
    },
  }
}
