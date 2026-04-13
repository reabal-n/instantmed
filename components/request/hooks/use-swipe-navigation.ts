"use client"

import { type PanInfo,useMotionValue } from "framer-motion"
import { useCallback } from "react"

const SWIPE_DISTANCE_THRESHOLD = 100
const SWIPE_VELOCITY_THRESHOLD = 500

interface UseSwipeNavigationOptions {
  onSwipeBack: () => void
  canGoBack: boolean
}

/**
 * Provides horizontal swipe-to-go-back gesture handling for mobile.
 *
 * Returns the motion value, drag-end handler, and constraint config
 * to spread onto a Framer Motion `motion.main` element.
 *
 * Swiping left (forward) is intentionally a no-op - users must
 * explicitly complete each step.
 */
export function useSwipeNavigation({ onSwipeBack, canGoBack }: UseSwipeNavigationOptions) {
  const dragX = useMotionValue(0)

  const handleDragEnd = useCallback(
    (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      if (
        canGoBack &&
        (info.offset.x > SWIPE_DISTANCE_THRESHOLD || info.velocity.x > SWIPE_VELOCITY_THRESHOLD)
      ) {
        // Swiped right - go back
        onSwipeBack()
      }
      // Swiped left - cannot go forward via swipe (must complete step)
      // This is intentional - users must explicitly complete steps

      // Reset drag position
      dragX.set(0)
    },
    [canGoBack, onSwipeBack, dragX],
  )

  const dragConstraints = { left: 0, right: 0 } as const

  return { dragX, handleDragEnd, dragConstraints }
}
