"use client"

import { cn } from "@/lib/utils"
import { useEffect, useRef, useState } from "react"

interface InfiniteSliderProps {
  children: React.ReactNode
  gap?: number
  speed?: number
  speedOnHover?: number
  reverse?: boolean
  className?: string
}

export function InfiniteSlider({
  children,
  gap = 24,
  speed = 50,
  speedOnHover = 20,
  reverse = false,
  className,
}: InfiniteSliderProps) {
  const [isHovered, setIsHovered] = useState(false)
  const scrollerRef = useRef<HTMLDivElement>(null)
  const hasAnimated = useRef(false)

  useEffect(() => {
    if (hasAnimated.current) return
    
    if (scrollerRef.current) {
      const scrollerContent = Array.from(scrollerRef.current.children)
      
      scrollerContent.forEach((item) => {
        const duplicatedItem = item.cloneNode(true)
        if (scrollerRef.current) {
          scrollerRef.current.appendChild(duplicatedItem)
        }
      })
      
      hasAnimated.current = true
    }
  }, [])

  const currentSpeed = isHovered ? speedOnHover : speed
  const duration = `${100 / (currentSpeed / 50)}s`

  return (
    <div
      className={cn("overflow-hidden", className)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        ref={scrollerRef}
        className={cn(
          "flex w-max animate-scroll",
          reverse && "direction-reverse"
        )}
        style={{
          gap: `${gap}px`,
          animationDuration: duration,
          animationPlayState: "running",
        }}
      >
        {children}
      </div>
    </div>
  )
}
