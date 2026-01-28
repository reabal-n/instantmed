/**
 * Mobile Utilities
 * 
 * Helpers for mobile-optimized UI and safe areas.
 */

/**
 * Safe area CSS variables
 * Use these for padding on mobile devices with notches/home indicators
 */
export const safeAreaVariables = {
  top: "env(safe-area-inset-top, 0px)",
  right: "env(safe-area-inset-right, 0px)",
  bottom: "env(safe-area-inset-bottom, 0px)",
  left: "env(safe-area-inset-left, 0px)",
}

/**
 * Tailwind classes for safe areas
 * Add these to elements that need safe area padding
 */
export const safeAreaClasses = {
  // Padding
  paddingTop: "pt-[env(safe-area-inset-top)]",
  paddingBottom: "pb-[env(safe-area-inset-bottom)]",
  paddingLeft: "pl-[env(safe-area-inset-left)]",
  paddingRight: "pr-[env(safe-area-inset-right)]",
  paddingX: "px-[max(1rem,env(safe-area-inset-left))] px-[max(1rem,env(safe-area-inset-right))]",
  
  // Bottom navigation safe area
  bottomNav: "pb-[calc(env(safe-area-inset-bottom)+0.5rem)]",
  
  // Full safe area padding
  all: "pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]",
}

/**
 * Touch target sizes (WCAG 2.1 Level AAA: 44x44px minimum)
 */
export const touchTargetClasses = {
  // Minimum touch target
  min: "min-h-[44px] min-w-[44px]",
  
  // Touch-friendly button
  button: "min-h-[44px] px-4",
  
  // Touch-friendly icon button
  iconButton: "h-11 w-11 p-2",
  
  // Touch-friendly list item
  listItem: "min-h-[48px] py-3",
  
  // Touch-friendly input
  input: "min-h-[44px] py-2",
}

/**
 * Mobile-first responsive breakpoints
 */
export const breakpoints = {
  sm: "640px",
  md: "768px",
  lg: "1024px",
  xl: "1280px",
  "2xl": "1536px",
}

/**
 * Check if device is mobile
 */
export function isMobileDevice(): boolean {
  if (typeof window === "undefined") return false
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  )
}

/**
 * Check if device is iOS
 */
export function isIOS(): boolean {
  if (typeof window === "undefined") return false
  return /iPad|iPhone|iPod/.test(navigator.userAgent)
}

/**
 * Check if device is Android
 */
export function isAndroid(): boolean {
  if (typeof window === "undefined") return false
  return /Android/i.test(navigator.userAgent)
}

/**
 * Check if running as PWA
 */
export function isPWA(): boolean {
  if (typeof window === "undefined") return false
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

/**
 * Check if device supports touch
 */
export function isTouchDevice(): boolean {
  if (typeof window === "undefined") return false
  return "ontouchstart" in window || navigator.maxTouchPoints > 0
}

/**
 * Get viewport dimensions
 */
export function getViewportDimensions(): { width: number; height: number } {
  if (typeof window === "undefined") return { width: 0, height: 0 }
  return {
    width: window.innerWidth,
    height: window.innerHeight,
  }
}

/**
 * Check if device is in landscape orientation
 */
export function isLandscape(): boolean {
  if (typeof window === "undefined") return false
  return window.matchMedia("(orientation: landscape)").matches
}

/**
 * Haptic feedback (if supported)
 */
export function hapticFeedback(type: "light" | "medium" | "heavy" = "light"): void {
  if (typeof navigator === "undefined") return
  
  if ("vibrate" in navigator) {
    const durations = {
      light: 10,
      medium: 20,
      heavy: 30,
    }
    navigator.vibrate(durations[type])
  }
}

/**
 * Prevent pull-to-refresh on specific elements
 */
export function preventPullToRefresh(element: HTMLElement): () => void {
  let startY = 0

  const handleTouchStart = (e: TouchEvent) => {
    startY = e.touches[0].clientY
  }

  const handleTouchMove = (e: TouchEvent) => {
    const y = e.touches[0].clientY
    const scrollTop = element.scrollTop

    // Prevent if at top and pulling down
    if (scrollTop === 0 && y > startY) {
      e.preventDefault()
    }
  }

  element.addEventListener("touchstart", handleTouchStart, { passive: true })
  element.addEventListener("touchmove", handleTouchMove, { passive: false })

  return () => {
    element.removeEventListener("touchstart", handleTouchStart)
    element.removeEventListener("touchmove", handleTouchMove)
  }
}

/**
 * Mobile keyboard visibility detection
 */
export function onKeyboardVisibilityChange(
  callback: (visible: boolean) => void
): () => void {
  if (typeof window === "undefined") return () => {}

  const initialHeight = window.innerHeight

  const handleResize = () => {
    const heightDiff = initialHeight - window.innerHeight
    // Keyboard is likely visible if height decreased by more than 150px
    callback(heightDiff > 150)
  }

  window.addEventListener("resize", handleResize)
  return () => window.removeEventListener("resize", handleResize)
}

/**
 * Scroll to element with offset for fixed headers
 */
export function scrollToElement(
  element: HTMLElement | string,
  offset = 80
): void {
  const el = typeof element === "string" 
    ? document.querySelector(element) 
    : element
    
  if (!el) return

  const y = el.getBoundingClientRect().top + window.scrollY - offset
  window.scrollTo({ top: y, behavior: "smooth" })
}
