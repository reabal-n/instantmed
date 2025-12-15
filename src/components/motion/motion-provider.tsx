'use client'

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import { LazyMotion, domAnimation, MotionConfig } from 'framer-motion'
import { duration, easing } from '@/lib/motion'

// =============================================================================
// CONTEXT
// =============================================================================

interface MotionContextValue {
  /** Whether user prefers reduced motion */
  reducedMotion: boolean
  /** Current duration multiplier (0.1 for reduced, 1 for normal) */
  durationMultiplier: number
}

const MotionContext = createContext<MotionContextValue>({
  reducedMotion: false,
  durationMultiplier: 1,
})

/**
 * Hook to access motion preferences
 * 
 * @example
 * const { reducedMotion } = useMotion()
 * const variants = reducedMotion ? reduced.fadeIn : fadeIn
 */
export function useMotion() {
  return useContext(MotionContext)
}

// =============================================================================
// PROVIDER
// =============================================================================

interface MotionProviderProps {
  children: ReactNode
}

/**
 * Motion system provider
 * 
 * Features:
 * - Lazy loads Framer Motion for better bundle size
 * - Detects prefers-reduced-motion
 * - Provides global motion config
 * 
 * @example
 * // In your root layout:
 * <MotionProvider>
 *   {children}
 * </MotionProvider>
 */
export function MotionProvider({ children }: MotionProviderProps) {
  const [reducedMotion, setReducedMotion] = useState(false)

  useEffect(() => {
    // Check initial preference
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReducedMotion(mediaQuery.matches)

    // Listen for changes
    function handleChange(event: MediaQueryListEvent) {
      setReducedMotion(event.matches)
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  const durationMultiplier = reducedMotion ? 0.1 : 1

  const contextValue: MotionContextValue = {
    reducedMotion,
    durationMultiplier,
  }

  return (
    <MotionContext.Provider value={contextValue}>
      <LazyMotion features={domAnimation} strict>
        <MotionConfig
          reducedMotion={reducedMotion ? 'always' : 'never'}
          transition={{
            duration: duration.normal * durationMultiplier,
            ease: easing.default,
          }}
        >
          {children}
        </MotionConfig>
      </LazyMotion>
    </MotionContext.Provider>
  )
}

// =============================================================================
// EXPORTS
// =============================================================================

export { MotionContext }
