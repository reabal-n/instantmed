"use client"

import { useEffect, useRef, useCallback, useState } from "react"
import { useRouter } from "next/navigation"

/**
 * usePrefetch Hook
 * 
 * Prefetch pages on hover/focus for faster navigation
 */
export function usePrefetch() {
  const router = useRouter()
  const prefetchedRef = useRef<Set<string>>(new Set())

  const prefetch = useCallback((href: string) => {
    if (prefetchedRef.current.has(href)) return
    prefetchedRef.current.add(href)
    router.prefetch(href)
  }, [router])

  return { prefetch }
}

/**
 * PrefetchLink Component
 * 
 * Link that prefetches on hover/focus
 */
interface PrefetchLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string
  children: React.ReactNode
}

export function PrefetchLink({ href, children, ...props }: PrefetchLinkProps) {
  const { prefetch } = usePrefetch()

  return (
    <a
      href={href}
      onMouseEnter={() => prefetch(href)}
      onFocus={() => prefetch(href)}
      {...props}
    >
      {children}
    </a>
  )
}

/**
 * useDebounce Hook
 * 
 * Debounce values for performance (e.g., search inputs)
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

/**
 * useThrottle Hook
 * 
 * Throttle function calls for performance (e.g., scroll handlers)
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Generic function type requires any for flexibility
export function useThrottle<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): T {
  const lastRunRef = useRef<number>(0)
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)

  return ((...args: Parameters<T>) => {
    const now = Date.now()

    if (now - lastRunRef.current >= delay) {
      lastRunRef.current = now
      func(...args)
    } else {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = setTimeout(() => {
        lastRunRef.current = Date.now()
        func(...args)
      }, delay - (now - lastRunRef.current))
    }
  }) as T
}
