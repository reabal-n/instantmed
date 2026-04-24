/**
 * InstantMed Motion Tokens
 *
 * Timing constants, easing presets, and shared animation variants.
 *
 * Design System rules:
 * - 200–500ms durations, ease-out only
 * - No bounce, no elastic, no spring physics
 * - Max scale 1.02x
 * - Reduced motion: `initial={{}}` (empty object), never `initial={false}`
 *
 * For the reactive `useReducedMotion` hook, import from `@/components/ui/motion`.
 * For `motion` and `AnimatePresence`, import directly from `framer-motion`.
 */

import type { Transition, Variants } from 'framer-motion'

// =============================================================================
// TIMING CONSTANTS
// =============================================================================

export const duration = {
  instant: 0.2,   // 200ms - brand minimum
  fast: 0.2,      // 200ms - snappy, responsive
  normal: 0.2,    // 200ms - standard smooth
  slow: 0.22,     // 220ms - generous, reassuring
  slower: 0.25,   // 250ms - final fallback for complex motions
  page: 0.2,      // 200ms - page transitions
} as const

export const staggerDelay = {
  fast: 0.04,     // 40ms between staggered items
  normal: 0.06,   // 60ms between staggered items
  slow: 0.08,     // 80ms between staggered items
} as const

// =============================================================================
// EASING PRESETS
// =============================================================================
// ONLY ease-out. No bounces. No springs.

export const easing = {
  default: [0, 0, 0.2, 1] as const,          // ease-out
  in: [0.4, 0, 1, 1] as const,               // only if truly needed
  out: [0, 0, 0.2, 1] as const,              // PRIMARY
  inOut: [0.42, 0, 0.58, 1] as const,        // fallback
  /** Strong ease-out — instant perceived responsiveness for scroll reveals */
  strongOut: [0.23, 1, 0.32, 1] as const,
  /** Smooth confident curve used by panels/drawers/sheets */
  panel: [0.16, 1, 0.3, 1] as const,
  css: {
    default: 'ease-out',
  },
} as const

// =============================================================================
// SPRING PRESETS (tween-based, NOT spring physics)
// =============================================================================

export const spring = {
  snappy: { duration: 0.15, ease: 'easeOut' } as Transition,
  smooth: { duration: 0.2, ease: 'easeOut' } as Transition,
  bouncy: { duration: 0.15, ease: 'easeOut' } as Transition,
  gentle: { duration: 0.2, ease: 'easeOut' } as Transition,
}

// =============================================================================
// TRANSITION PRESETS
// =============================================================================

export const transition = {
  fast: { duration: duration.fast, ease: 'easeOut' } as Transition,
  normal: { duration: duration.normal, ease: 'easeOut' } as Transition,
  slow: { duration: duration.slow, ease: 'easeOut' } as Transition,
  page: { duration: duration.page, ease: 'easeOut' } as Transition,
}

// =============================================================================
// ANIMATION VARIANTS (only those with active consumers)
// =============================================================================

/** Simple fade */
export const fadeIn: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: transition.normal },
  exit: { opacity: 0, transition: transition.fast },
}

/** Fade + slide up - most common entrance */
export const fadeUp: Variants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.23, 1, 0.32, 1] } },
  exit: { opacity: 0, y: -6, transition: transition.fast },
}

/** Stagger container + item system */
export const stagger = {
  container: {
    initial: {},
    animate: {
      transition: {
        staggerChildren: staggerDelay.normal,
        delayChildren: 0.1,
      },
    },
    exit: {
      transition: {
        staggerChildren: staggerDelay.fast,
        staggerDirection: -1,
      },
    },
  } as Variants,
  containerFast: {
    initial: {},
    animate: {
      transition: {
        staggerChildren: staggerDelay.fast,
        delayChildren: 0.05,
      },
    },
    exit: {
      transition: {
        staggerChildren: 0.02,
        staggerDirection: -1,
      },
    },
  } as Variants,
  containerSlow: {
    initial: {},
    animate: {
      transition: {
        staggerChildren: staggerDelay.slow,
        delayChildren: 0.15,
      },
    },
  } as Variants,
  item: fadeUp,
  itemFade: fadeIn,
}
