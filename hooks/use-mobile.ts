"use client"

import { useState, useEffect } from "react"

/**
 * Hook to detect mobile devices and provide mobile-specific utilities
 */
export function useMobile() {
  const [isMobile, setIsMobile] = useState(false)
  const [isTablet, setIsTablet] = useState(false)
  const [isTouch, setIsTouch] = useState(false)

  useEffect(() => {
    const checkDevice = () => {
      const width = window.innerWidth
      setIsMobile(width < 768)
      setIsTablet(width >= 768 && width < 1024)
      
      // Check for touch capability
      setIsTouch(
        "ontouchstart" in window ||
        navigator.maxTouchPoints > 0 ||
        // @ts-ignore
        navigator.msMaxTouchPoints > 0
      )
    }

    checkDevice()
    window.addEventListener("resize", checkDevice)
    return () => window.removeEventListener("resize", checkDevice)
  }, [])

  return {
    isMobile,
    isTablet,
    isDesktop: !isMobile && !isTablet,
    isTouch,
  }
}

/**
 * Hook to get safe area insets for mobile devices (notch, etc.)
 */
export function useSafeArea() {
  const [safeArea, setSafeArea] = useState({
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  })

  useEffect(() => {
    const updateSafeArea = () => {
      // Use CSS environment variables if available
      const style = getComputedStyle(document.documentElement)
      setSafeArea({
        top: parseInt(style.getPropertyValue("--safe-area-inset-top") || "0"),
        bottom: parseInt(style.getPropertyValue("--safe-area-inset-bottom") || "0"),
        left: parseInt(style.getPropertyValue("--safe-area-inset-left") || "0"),
        right: parseInt(style.getPropertyValue("--safe-area-inset-right") || "0"),
      })
    }

    updateSafeArea()
    window.addEventListener("resize", updateSafeArea)
    return () => window.removeEventListener("resize", updateSafeArea)
  }, [])

  return safeArea
}

