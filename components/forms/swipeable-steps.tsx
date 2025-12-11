"use client"

import type React from "react"
import { useRef, useState } from "react"

interface SwipeableStepsProps {
  children: React.ReactNode
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
  canSwipeLeft?: boolean
  canSwipeRight?: boolean
}

export function SwipeableSteps({
  children,
  onSwipeLeft,
  onSwipeRight,
  canSwipeLeft = true,
  canSwipeRight = true,
}: SwipeableStepsProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [touchStart, setTouchStart] = useState<number | null>(null)
  const [touchEnd, setTouchEnd] = useState<number | null>(null)
  const [swiping, setSwiping] = useState(false)
  const [swipeOffset, setSwipeOffset] = useState(0)

  const minSwipeDistance = 50

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null)
    setTouchStart(e.targetTouches[0].clientX)
    setSwiping(true)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStart) return
    const currentTouch = e.targetTouches[0].clientX
    const diff = currentTouch - touchStart

    // Only allow swipe in valid directions
    if ((diff > 0 && !canSwipeRight) || (diff < 0 && !canSwipeLeft)) {
      setSwipeOffset(0)
      return
    }

    // Limit swipe distance with resistance
    const maxSwipe = 100
    const resistance = 0.5
    const offset = Math.sign(diff) * Math.min(Math.abs(diff) * resistance, maxSwipe)
    setSwipeOffset(offset)
    setTouchEnd(currentTouch)
  }

  const handleTouchEnd = () => {
    setSwiping(false)
    setSwipeOffset(0)

    if (!touchStart || !touchEnd) return

    const distance = touchStart - touchEnd
    const isLeftSwipe = distance > minSwipeDistance
    const isRightSwipe = distance < -minSwipeDistance

    if (isLeftSwipe && canSwipeLeft && onSwipeLeft) {
      onSwipeLeft()
    }
    if (isRightSwipe && canSwipeRight && onSwipeRight) {
      onSwipeRight()
    }
  }

  return (
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="touch-pan-y"
      style={{
        transform: `translateX(${swipeOffset}px)`,
        transition: swiping ? "none" : "transform 200ms ease-out",
      }}
    >
      {children}
    </div>
  )
}
