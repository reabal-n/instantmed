"use client"

import { useEffect, useState, useRef, ReactNode } from "react"
import { cn } from "@/lib/utils"

interface SwipeableProps {
  children: ReactNode
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
  onSwipeUp?: () => void
  onSwipeDown?: () => void
  /** Minimum distance for swipe to register */
  threshold?: number
  className?: string
}

/**
 * Swipeable container for mobile gesture support
 */
export function Swipeable({
  children,
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  onSwipeDown,
  threshold = 50,
  className,
}: SwipeableProps) {
  const startX = useRef(0)
  const startY = useRef(0)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleTouchStart = (e: TouchEvent) => {
      startX.current = e.touches[0].clientX
      startY.current = e.touches[0].clientY
    }

    const handleTouchEnd = (e: TouchEvent) => {
      const endX = e.changedTouches[0].clientX
      const endY = e.changedTouches[0].clientY
      const diffX = endX - startX.current
      const diffY = endY - startY.current

      // Determine if horizontal or vertical swipe
      if (Math.abs(diffX) > Math.abs(diffY)) {
        // Horizontal swipe
        if (Math.abs(diffX) > threshold) {
          if (diffX > 0) {
            onSwipeRight?.()
          } else {
            onSwipeLeft?.()
          }
        }
      } else {
        // Vertical swipe
        if (Math.abs(diffY) > threshold) {
          if (diffY > 0) {
            onSwipeDown?.()
          } else {
            onSwipeUp?.()
          }
        }
      }
    }

    container.addEventListener("touchstart", handleTouchStart, { passive: true })
    container.addEventListener("touchend", handleTouchEnd, { passive: true })

    return () => {
      container.removeEventListener("touchstart", handleTouchStart)
      container.removeEventListener("touchend", handleTouchEnd)
    }
  }, [onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown, threshold])

  return (
    <div ref={containerRef} className={className}>
      {children}
    </div>
  )
}

interface SwipeableTabsProps {
  tabs: { id: string; label: string; content: ReactNode }[]
  defaultTab?: string
  className?: string
  tabClassName?: string
  contentClassName?: string
}

/**
 * Swipeable tabs with gesture navigation for mobile
 */
export function SwipeableTabs({
  tabs,
  defaultTab,
  className,
  tabClassName,
  contentClassName,
}: SwipeableTabsProps) {
  const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.id)
  const [isAnimating, setIsAnimating] = useState(false)
  const [slideDirection, setSlideDirection] = useState<"left" | "right" | null>(null)

  const currentIndex = tabs.findIndex((t) => t.id === activeTab)

  const goToTab = (direction: "left" | "right") => {
    if (isAnimating) return

    const newIndex =
      direction === "left"
        ? Math.min(currentIndex + 1, tabs.length - 1)
        : Math.max(currentIndex - 1, 0)

    if (newIndex !== currentIndex) {
      setIsAnimating(true)
      setSlideDirection(direction)
      setActiveTab(tabs[newIndex].id)

      setTimeout(() => {
        setIsAnimating(false)
        setSlideDirection(null)
      }, 300)
    }
  }

  return (
    <div className={className}>
      {/* Tab headers */}
      <div className={cn("flex border-b border-border", tabClassName)}>
        {tabs.map((tab, index) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex-1 px-4 py-3 text-sm font-medium transition-colors relative",
              activeTab === tab.id
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.label}
            {activeTab === tab.id && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
            )}
          </button>
        ))}
      </div>

      {/* Tab content with swipe support */}
      <Swipeable
        onSwipeLeft={() => goToTab("left")}
        onSwipeRight={() => goToTab("right")}
        className={cn(
          "relative overflow-hidden",
          contentClassName
        )}
      >
        <div
          className={cn(
            "transition-transform duration-300 ease-out",
            isAnimating &&
              (slideDirection === "left" ? "-translate-x-2" : "translate-x-2")
          )}
        >
          {tabs.find((t) => t.id === activeTab)?.content}
        </div>
      </Swipeable>

      {/* Dot indicators for mobile */}
      <div className="flex justify-center gap-2 mt-4 md:hidden">
        {tabs.map((tab, index) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "w-2 h-2 rounded-full transition-all",
              activeTab === tab.id
                ? "bg-primary w-6"
                : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
            )}
            aria-label={`Go to ${tab.label}`}
          />
        ))}
      </div>
    </div>
  )
}

interface SwipeableCarouselProps {
  items: ReactNode[]
  className?: string
  showDots?: boolean
  showArrows?: boolean
  autoPlay?: boolean
  autoPlayInterval?: number
}

/**
 * Swipeable carousel for mobile
 */
export function SwipeableCarousel({
  items,
  className,
  showDots = true,
  showArrows = true,
  autoPlay = false,
  autoPlayInterval = 5000,
}: SwipeableCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)

  const goTo = (index: number) => {
    if (isAnimating) return
    setIsAnimating(true)
    setCurrentIndex(index)
    setTimeout(() => setIsAnimating(false), 300)
  }

  const goNext = () => {
    goTo((currentIndex + 1) % items.length)
  }

  const goPrev = () => {
    goTo((currentIndex - 1 + items.length) % items.length)
  }

  // Auto-play
  useEffect(() => {
    if (!autoPlay) return
    const interval = setInterval(goNext, autoPlayInterval)
    return () => clearInterval(interval)
  }, [autoPlay, autoPlayInterval, currentIndex, goNext])

  return (
    <div className={cn("relative", className)}>
      <Swipeable
        onSwipeLeft={goNext}
        onSwipeRight={goPrev}
        className="overflow-hidden"
      >
        <div
          className="flex transition-transform duration-300 ease-out"
          style={{ transform: `translateX(-${currentIndex * 100}%)` }}
        >
          {items.map((item, index) => (
            <div key={index} className="w-full flex-shrink-0">
              {item}
            </div>
          ))}
        </div>
      </Swipeable>

      {/* Navigation arrows */}
      {showArrows && items.length > 1 && (
        <>
          <button
            onClick={goPrev}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-background/80 backdrop-blur border border-border shadow-lg flex items-center justify-center hover:bg-background transition-colors"
            aria-label="Previous"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={goNext}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-background/80 backdrop-blur border border-border shadow-lg flex items-center justify-center hover:bg-background transition-colors"
            aria-label="Next"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </>
      )}

      {/* Dot indicators */}
      {showDots && items.length > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          {items.map((_, index) => (
            <button
              key={index}
              onClick={() => goTo(index)}
              className={cn(
                "w-2 h-2 rounded-full transition-all",
                currentIndex === index
                  ? "bg-primary w-6"
                  : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
              )}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default Swipeable
