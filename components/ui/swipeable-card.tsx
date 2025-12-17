"use client"

import { useState, useRef, useCallback } from "react"
import { cn } from "@/lib/utils"

interface SwipeAction {
  icon: React.ReactNode
  label: string
  color: string
  bgColor: string
  onAction: () => void
}

interface SwipeableCardProps {
  children: React.ReactNode
  leftAction?: SwipeAction
  rightAction?: SwipeAction
  className?: string
  threshold?: number
}

export function SwipeableCard({
  children,
  leftAction,
  rightAction,
  className,
  threshold = 80,
}: SwipeableCardProps) {
  const [offset, setOffset] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const startX = useRef(0)
  const currentX = useRef(0)
  const cardRef = useRef<HTMLDivElement>(null)

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX
    currentX.current = e.touches[0].clientX
    setIsDragging(true)
  }, [])

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!isDragging) return
      currentX.current = e.touches[0].clientX
      const diff = currentX.current - startX.current

      // Limit swipe based on available actions
      let newOffset = diff
      if (!leftAction && diff > 0) newOffset = 0
      if (!rightAction && diff < 0) newOffset = 0

      // Add resistance at edges
      const maxOffset = 120
      if (Math.abs(newOffset) > maxOffset) {
        const excess = Math.abs(newOffset) - maxOffset
        newOffset = (newOffset > 0 ? 1 : -1) * (maxOffset + excess * 0.2)
      }

      setOffset(newOffset)
    },
    [isDragging, leftAction, rightAction]
  )

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false)

    if (Math.abs(offset) >= threshold) {
      if (offset > 0 && leftAction) {
        // Trigger left action (swipe right)
        setOffset(150)
        setTimeout(() => {
          leftAction.onAction()
          setOffset(0)
        }, 200)
        return
      }
      if (offset < 0 && rightAction) {
        // Trigger right action (swipe left)
        setOffset(-150)
        setTimeout(() => {
          rightAction.onAction()
          setOffset(0)
        }, 200)
        return
      }
    }

    // Snap back
    setOffset(0)
  }, [offset, threshold, leftAction, rightAction])

  const leftProgress = leftAction ? Math.min(offset / threshold, 1) : 0
  const rightProgress = rightAction ? Math.min(-offset / threshold, 1) : 0

  return (
    <div className={cn("relative overflow-hidden rounded-2xl", className)}>
      {/* Left action background (swipe right reveals) */}
      {leftAction && (
        <div
          className={cn(
            "absolute inset-y-0 left-0 flex items-center justify-start pl-6 transition-opacity",
            leftAction.bgColor
          )}
          style={{
            width: Math.max(offset, 0),
            opacity: leftProgress,
          }}
        >
          <div
            className={cn(
              "flex items-center gap-2 transition-transform",
              leftAction.color
            )}
            style={{
              transform: `scale(${0.8 + leftProgress * 0.2})`,
            }}
          >
            {leftAction.icon}
            {leftProgress >= 0.8 && (
              <span className="text-sm font-medium animate-fade-in">
                {leftAction.label}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Right action background (swipe left reveals) */}
      {rightAction && (
        <div
          className={cn(
            "absolute inset-y-0 right-0 flex items-center justify-end pr-6 transition-opacity",
            rightAction.bgColor
          )}
          style={{
            width: Math.max(-offset, 0),
            opacity: rightProgress,
          }}
        >
          <div
            className={cn(
              "flex items-center gap-2 transition-transform",
              rightAction.color
            )}
            style={{
              transform: `scale(${0.8 + rightProgress * 0.2})`,
            }}
          >
            {rightProgress >= 0.8 && (
              <span className="text-sm font-medium animate-fade-in">
                {rightAction.label}
              </span>
            )}
            {rightAction.icon}
          </div>
        </div>
      )}

      {/* Main card content */}
      <div
        ref={cardRef}
        className={cn(
          "relative bg-background touch-pan-y",
          !isDragging && "transition-transform duration-200 ease-out"
        )}
        style={{
          transform: `translateX(${offset}px)`,
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {children}
      </div>

      {/* Swipe hint indicator (shows on first render) */}
      {(leftAction || rightAction) && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 md:hidden">
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground/50">
            {leftAction && <span>← Swipe</span>}
            {leftAction && rightAction && <span>|</span>}
            {rightAction && <span>Swipe →</span>}
          </div>
        </div>
      )}
    </div>
  )
}

// Pre-configured swipe actions
export const approveAction = (onAction: () => void): SwipeAction => ({
  icon: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  ),
  label: "Approve",
  color: "text-white",
  bgColor: "bg-emerald-500",
  onAction,
})

export const declineAction = (onAction: () => void): SwipeAction => ({
  icon: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  label: "Decline",
  color: "text-white",
  bgColor: "bg-red-500",
  onAction,
})

export const archiveAction = (onAction: () => void): SwipeAction => ({
  icon: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
    </svg>
  ),
  label: "Archive",
  color: "text-white",
  bgColor: "bg-gray-500",
  onAction,
})

export const viewAction = (onAction: () => void): SwipeAction => ({
  icon: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  ),
  label: "View",
  color: "text-white",
  bgColor: "bg-indigo-500",
  onAction,
})
