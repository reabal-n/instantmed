"use client"

import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"

/**
 * Mobile Utilities Hook
 * Detects mobile devices and provides utilities
 */
export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    
    checkMobile()
    window.addEventListener("resize", checkMobile)
    return () => window.removeEventListener("resize", checkMobile)
  }, [])

  return isMobile
}

/**
 * Touch Target Wrapper
 * Ensures minimum 44x44px touch target for mobile accessibility
 */
export function TouchTarget({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "min-h-[44px] min-w-[44px] flex items-center justify-center",
        "touch-target",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

/**
 * Mobile Container
 * Provides safe area padding for mobile devices
 */
export function MobileContainer({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "w-full",
        "px-4 sm:px-6 lg:px-8",
        "safe-x", // Safe area insets
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

/**
 * Mobile Safe Bottom
 * Adds safe area padding to bottom for mobile devices with home indicators
 */
export function MobileSafeBottom({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "pb-safe", // Safe area bottom padding
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

