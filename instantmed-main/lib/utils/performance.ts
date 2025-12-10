/**
 * Performance utilities for optimizing the application
 */

/**
 * Debounce function for rate-limiting function calls
 */
export function debounce<T extends (...args: Parameters<T>) => ReturnType<T>>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null

  return function (this: ThisParameterType<T>, ...args: Parameters<T>) {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }

    timeoutId = setTimeout(() => {
      func.apply(this, args)
    }, wait)
  }
}

/**
 * Throttle function for limiting function calls to once per interval
 */
export function throttle<T extends (...args: Parameters<T>) => ReturnType<T>>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false

  return function (this: ThisParameterType<T>, ...args: Parameters<T>) {
    if (!inThrottle) {
      func.apply(this, args)
      inThrottle = true
      setTimeout(() => {
        inThrottle = false
      }, limit)
    }
  }
}

/**
 * Lazy load an image and return a promise
 */
export function preloadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

/**
 * Preload multiple images in parallel
 */
export async function preloadImages(sources: string[]): Promise<HTMLImageElement[]> {
  return Promise.all(sources.map(preloadImage))
}

/**
 * Check if user prefers reduced motion
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches
}

/**
 * Request idle callback with fallback
 */
export function requestIdleCallback(callback: () => void, options?: { timeout: number }): number {
  if (typeof window === "undefined") {
    return 0
  }

  if ("requestIdleCallback" in window) {
    return (window as Window & { requestIdleCallback: (cb: () => void, opts?: { timeout: number }) => number }).requestIdleCallback(callback, options)
  }

  // Fallback for Safari
  return globalThis.setTimeout(callback, options?.timeout || 1) as unknown as number
}

/**
 * Cancel idle callback with fallback
 */
export function cancelIdleCallback(id: number): void {
  if (typeof window === "undefined") return

  if ("cancelIdleCallback" in window) {
    (window as Window & { cancelIdleCallback: (id: number) => void }).cancelIdleCallback(id)
  } else {
    globalThis.clearTimeout(id)
  }
}

/**
 * Measure performance of a function
 */
export async function measurePerformance<T>(
  name: string,
  fn: () => T | Promise<T>
): Promise<T> {
  const start = performance.now()
  const result = await fn()
  const end = performance.now()

  if (process.env.NODE_ENV === "development") {
    console.log(`[Performance] ${name}: ${(end - start).toFixed(2)}ms`)
  }

  return result
}

/**
 * Create a simple in-memory cache with TTL
 */
export function createCache<T>(ttlMs: number = 60000) {
  const cache = new Map<string, { value: T; expiry: number }>()

  return {
    get(key: string): T | undefined {
      const item = cache.get(key)
      if (!item) return undefined
      if (Date.now() > item.expiry) {
        cache.delete(key)
        return undefined
      }
      return item.value
    },

    set(key: string, value: T): void {
      cache.set(key, { value, expiry: Date.now() + ttlMs })
    },

    delete(key: string): void {
      cache.delete(key)
    },

    clear(): void {
      cache.clear()
    },

    has(key: string): boolean {
      const item = cache.get(key)
      if (!item) return false
      if (Date.now() > item.expiry) {
        cache.delete(key)
        return false
      }
      return true
    },
  }
}

/**
 * Intersection Observer hook helper for lazy loading
 */
export function createIntersectionObserver(
  callback: IntersectionObserverCallback,
  options?: IntersectionObserverInit
): IntersectionObserver | null {
  if (typeof window === "undefined" || !("IntersectionObserver" in window)) {
    return null
  }

  return new IntersectionObserver(callback, {
    rootMargin: "50px",
    threshold: 0.1,
    ...options,
  })
}
