"use client"

import type { TouchEvent } from "react"
import { useCallback, useRef } from "react"

const SWIPE_DISTANCE_THRESHOLD = 100
const SWIPE_VELOCITY_THRESHOLD = 500

interface UseSwipeNavigationOptions {
  onSwipeBack: () => void
  canGoBack: boolean
}

/**
 * Provides horizontal swipe-to-go-back gesture handling for mobile.
 *
 * Swiping left (forward) is intentionally a no-op - users must
 * explicitly complete each step.
 */
export function useSwipeNavigation({ onSwipeBack, canGoBack }: UseSwipeNavigationOptions) {
  const startXRef = useRef<number | null>(null)
  const startTimeRef = useRef<number | null>(null)

  const handleTouchStart = useCallback(
    (event: TouchEvent<HTMLElement>) => {
      if (!canGoBack) return
      const touch = event.changedTouches[0]
      if (!touch) return
      startXRef.current = touch.clientX
      startTimeRef.current = performance.now()
    },
    [canGoBack],
  )

  const handleTouchEnd = useCallback(
    (event: TouchEvent<HTMLElement>) => {
      const startX = startXRef.current
      const startTime = startTimeRef.current
      startXRef.current = null
      startTimeRef.current = null

      if (!canGoBack || startX === null || startTime === null) return

      const touch = event.changedTouches[0]
      if (!touch) return

      const offsetX = touch.clientX - startX
      const elapsedMs = Math.max(performance.now() - startTime, 1)
      const velocityX = (offsetX / elapsedMs) * 1000

      if (
        canGoBack &&
        (offsetX > SWIPE_DISTANCE_THRESHOLD || velocityX > SWIPE_VELOCITY_THRESHOLD)
      ) {
        onSwipeBack()
      }
    },
    [canGoBack, onSwipeBack],
  )

  return { handleTouchStart, handleTouchEnd }
}
