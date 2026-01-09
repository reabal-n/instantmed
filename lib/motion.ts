/**
 * InstantMed Motion System
 * Framer Motion presets with reduced-motion support
 *
 * Usage:
 * import { fadeIn, fadeUp, pageIn, stagger, hoverLift, press } from '@/lib/motion'
 *
 * <motion.div variants={fadeIn} initial="initial" animate="animate" />
 * <motion.button {...hoverLift} {...press} />
 */

import type { Transition, Variants, TargetAndTransition } from 'framer-motion'

// =============================================================================
// GLOBAL TIMING CONSTANTS
// =============================================================================
// InstantMed Design System: Subtle, physical motion (150-220ms)
// No bounce. No elastic. Ease-out only.

export const duration = {
  instant: 0.15,  // 150ms - minimum perceptible
  fast: 0.15,     // 150ms - snappy, responsive
  normal: 0.18,   // 180ms - standard smooth
  slow: 0.22,     // 220ms - generous, reassuring
  slower: 0.25,   // 250ms - final fallback for complex motions
  page: 0.2,      // 200ms - page transitions
} as const

export const staggerDelay = {
  fast: 0.04,    // 40ms between staggered items
  normal: 0.06,  // 60ms between staggered items
  slow: 0.08,    // 80ms between staggered items
} as const

// =============================================================================
// GLOBAL EASING PRESETS
// =============================================================================
// ONLY ease-out. No bounces. No springs.

export const easing = {
  // ease-out is the ONLY easing we use
  // It feels physical and natural
  default: [0, 0, 0.2, 1] as const,     // ease-out
  in: [0.4, 0, 1, 1] as const,          // only if truly needed
  out: [0, 0, 0.2, 1] as const,         // PRIMARY
  inOut: [0.42, 0, 0.58, 1] as const,   // fallback
  
  // Expressive easings - DEPRECATED
  // Do not use bounce or spring
  bounce: [0, 0, 0.2, 1] as const,     // fallback to ease-out
  spring: [0, 0, 0.2, 1] as const,     // fallback to ease-out
  smooth: [0, 0, 0.2, 1] as const,     // fallback to ease-out
  
  // CSS-compatible strings
  css: {
    default: 'ease-out',
    bounce: 'ease-out',
    spring: 'ease-out',
  },
} as const

// =============================================================================
// SPRING PRESETS - SOFT POP GLASS
// =============================================================================
// Spring physics for premium, tactile feel (Linear style)
// Use for interactive elements, modals, and micro-interactions

export const spring = {
  /** Snappy spring - buttons, small interactions */
  snappy: { 
    type: "spring" as const, 
    stiffness: 400, 
    damping: 30 
  } as Transition,
  /** Smooth spring - page transitions, modals */
  smooth: { 
    type: "spring" as const, 
    stiffness: 200, 
    damping: 25 
  } as Transition,
  /** Bouncy spring - celebratory animations */
  bouncy: { 
    type: "spring" as const, 
    stiffness: 300, 
    damping: 20 
  } as Transition,
  /** Gentle spring - subtle movements */
  gentle: { 
    type: "spring" as const, 
    stiffness: 150, 
    damping: 20 
  } as Transition,
}

// Legacy duration-based fallbacks (for reduced motion)
export const springFallback = {
  snappy: { duration: 0.15, ease: 'easeOut' } as Transition,
  smooth: { duration: 0.18, ease: 'easeOut' } as Transition,
  bouncy: { duration: 0.15, ease: 'easeOut' } as Transition,
  gentle: { duration: 0.2, ease: 'easeOut' } as Transition,
}

// =============================================================================
// TRANSITION PRESETS
// =============================================================================
// All transitions use ease-out with 150-220ms durations

export const transition = {
  fast: { duration: duration.fast, ease: 'easeOut' } as Transition,
  normal: { duration: duration.normal, ease: 'easeOut' } as Transition,
  slow: { duration: duration.slow, ease: 'easeOut' } as Transition,
  page: { duration: duration.page, ease: 'easeOut' } as Transition,
}

// =============================================================================
// REDUCED MOTION SUPPORT
// =============================================================================

/**
 * Check if user prefers reduced motion
 * Safe for SSR - returns false on server
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * Get duration based on reduced motion preference
 */
export function getReducedDuration(normalDuration: number): number {
  return prefersReducedMotion() ? Math.min(normalDuration * 0.1, 0.01) : normalDuration
}

/**
 * Create reduced-motion-safe variants
 * Disables transforms and reduces duration when user prefers reduced motion
 */
export function withReducedMotion<T extends Variants>(variants: T): T {
  if (typeof window === 'undefined') return variants
  if (!prefersReducedMotion()) return variants

  const reduced: Record<string, unknown> = {}
  
  for (const [key, value] of Object.entries(variants)) {
    if (typeof value === 'object' && value !== null) {
      const { x: _x, y: _y, scale: _scale, rotate: _rotate, ...rest } = value as Record<string, unknown>
      reduced[key] = {
        ...rest,
        // Keep opacity for reduced motion, remove transforms
        transition: {
          duration: 0.01,
        },
      }
    } else {
      reduced[key] = value
    }
  }
  
  return reduced as T
}

// =============================================================================
// ANIMATION VARIANTS
// =============================================================================

/**
 * Page entrance animation
 * Slide up with fade for page-level content
 */
export const pageIn: Variants = {
  initial: {
    opacity: 0,
    y: 20,
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: duration.page,
      ease: easing.out,
    },
  },
  exit: {
    opacity: 0,
    y: -10,
    transition: {
      duration: duration.fast,
      ease: easing.in,
    },
  },
}

/**
 * Fade up animation
 * Slide up with fade - most common entrance
 */
export const fadeUp: Variants = {
  initial: {
    opacity: 0,
    y: 16,
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: spring.smooth,
  },
  exit: {
    opacity: 0,
    y: -8,
    transition: transition.fast,
  },
}

/**
 * Simple fade animation
 */
export const fadeIn: Variants = {
  initial: {
    opacity: 0,
  },
  animate: {
    opacity: 1,
    transition: transition.normal,
  },
  exit: {
    opacity: 0,
    transition: transition.fast,
  },
}

/**
 * Fade in with blur (premium reveal)
 */
export const fadeInBlur: Variants = {
  initial: {
    opacity: 0,
    filter: 'blur(4px)',
  },
  animate: {
    opacity: 1,
    filter: 'blur(0px)',
    transition: transition.slow,
  },
  exit: {
    opacity: 0,
    filter: 'blur(4px)',
    transition: transition.fast,
  },
}

/**
 * Scale in animation
 */
export const scaleIn: Variants = {
  initial: {
    opacity: 0,
    scale: 0.96,
  },
  animate: {
    opacity: 1,
    scale: 1,
    transition: spring.snappy,
  },
  exit: {
    opacity: 0,
    scale: 0.96,
    transition: transition.fast,
  },
}

/**
 * Slide from left
 */
export const slideLeft: Variants = {
  initial: { opacity: 0, x: -20 },
  animate: { opacity: 1, x: 0, transition: spring.smooth },
  exit: { opacity: 0, x: 20, transition: transition.fast },
}

/**
 * Slide from right
 */
export const slideRight: Variants = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0, transition: spring.smooth },
  exit: { opacity: 0, x: -20, transition: transition.fast },
}

/**
 * Pop in with bounce (celebratory)
 */
export const popIn: Variants = {
  initial: { opacity: 0, scale: 0.5 },
  animate: { opacity: 1, scale: 1, transition: spring.bouncy },
  exit: { opacity: 0, scale: 0.8, transition: transition.fast },
}

// =============================================================================
// STAGGER SYSTEM
// =============================================================================

/**
 * Stagger container and item variants
 * 
 * Usage:
 * <motion.div variants={stagger.container} initial="initial" animate="animate">
 *   <motion.div variants={stagger.item}>Child 1</motion.div>
 *   <motion.div variants={stagger.item}>Child 2</motion.div>
 * </motion.div>
 */
export const stagger = {
  /** Default stagger container */
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

  /** Fast stagger for lists */
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

  /** Slow stagger for hero sections */
  containerSlow: {
    initial: {},
    animate: {
      transition: {
        staggerChildren: staggerDelay.slow,
        delayChildren: 0.15,
      },
    },
  } as Variants,

  /** Default stagger item (fade up) */
  item: fadeUp,

  /** Fade-only stagger item */
  itemFade: fadeIn,

  /** Scale stagger item */
  itemScale: scaleIn,
}

// =============================================================================
// HOVER ANIMATIONS
// =============================================================================

/**
 * Lift effect on hover
 * Usage: <motion.div whileHover={hoverLift.hover} whileTap={hoverLift.tap} />
 * Or:    <motion.div {...hoverLift} />
 */
export const hoverLift = {
  whileHover: {
    y: -2,
    transition: spring.snappy,
  } as TargetAndTransition,
  whileTap: {
    y: 0,
    scale: 0.98,
    transition: { duration: duration.instant },
  } as TargetAndTransition,
}

/**
 * Scale effect on hover
 */
export const hoverScale = {
  whileHover: {
    scale: 1.02,
    transition: spring.snappy,
  } as TargetAndTransition,
  whileTap: {
    scale: 0.98,
    transition: { duration: duration.instant },
  } as TargetAndTransition,
}

/**
 * Subtle scale for buttons
 */
export const hoverScaleSubtle = {
  whileHover: {
    scale: 1.01,
    transition: spring.snappy,
  } as TargetAndTransition,
  whileTap: {
    scale: 0.99,
    transition: { duration: duration.instant },
  } as TargetAndTransition,
}

/**
 * Glow effect on hover (via boxShadow)
 * Note: Requires element to have position: relative and proper background
 */
export const glowHover = {
  whileHover: {
    boxShadow: '0 0 20px rgba(101, 163, 185, 0.3), 0 0 40px rgba(101, 163, 185, 0.15)',
    transition: { duration: duration.normal, ease: easing.default },
  } as TargetAndTransition,
  whileTap: {
    boxShadow: '0 0 10px rgba(101, 163, 185, 0.2), 0 0 20px rgba(101, 163, 185, 0.1)',
    scale: 0.98,
    transition: { duration: duration.instant },
  } as TargetAndTransition,
}

/**
 * Combined lift + glow (Soft Pop Glass)
 * Uses colored glow shadows instead of black
 */
export const hoverLiftGlow = {
  whileHover: {
    y: -4,
    scale: 1.01,
    boxShadow: '0 20px 40px rgba(59, 130, 246, 0.12)',
    transition: spring.snappy,
  } as TargetAndTransition,
  whileTap: {
    y: 0,
    scale: 0.98,
    boxShadow: '0 8px 30px rgba(59, 130, 246, 0.08)',
    transition: { duration: duration.instant },
  } as TargetAndTransition,
}

/**
 * Soft Pop Glass card hover with purple glow (dark mode friendly)
 */
export const hoverLiftGlowPurple = {
  whileHover: {
    y: -4,
    scale: 1.01,
    boxShadow: '0 20px 40px rgba(139, 92, 246, 0.15)',
    transition: spring.snappy,
  } as TargetAndTransition,
  whileTap: {
    y: 0,
    scale: 0.98,
    boxShadow: '0 8px 30px rgba(139, 92, 246, 0.10)',
    transition: { duration: duration.instant },
  } as TargetAndTransition,
}

/**
 * Soft Pop Glass button glow
 */
export const buttonGlow = {
  whileHover: {
    scale: 1.02,
    boxShadow: '0 12px 40px rgba(59, 130, 246, 0.35)',
    transition: spring.snappy,
  } as TargetAndTransition,
  whileTap: {
    scale: 0.98,
    boxShadow: '0 8px 30px rgba(59, 130, 246, 0.25)',
    transition: { duration: duration.instant },
  } as TargetAndTransition,
}

// =============================================================================
// PRESS / TAP ANIMATIONS
// =============================================================================

/**
 * Press/tap scale effect
 * Usage: <motion.button {...press} />
 */
export const press = {
  whileTap: {
    scale: 0.98,
    transition: { duration: duration.instant },
  } as TargetAndTransition,
}

/**
 * Deeper press for larger buttons
 */
export const pressDeep = {
  whileTap: {
    scale: 0.96,
    transition: { duration: duration.instant },
  } as TargetAndTransition,
}

/**
 * Press with opacity change
 */
export const pressOpacity = {
  whileTap: {
    scale: 0.98,
    opacity: 0.9,
    transition: { duration: duration.instant },
  } as TargetAndTransition,
}

// =============================================================================
// BUTTON INTERACTIONS (Complete System)
// =============================================================================

/**
 * Standard button interaction
 * Includes: press scale (0.98), hover lift, soft shadow
 * Usage: <motion.button {...buttonInteraction} />
 */
export const buttonInteraction = {
  whileHover: {
    y: -1,
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08), 0 2px 4px rgba(0, 0, 0, 0.04)',
    transition: { duration: duration.fast, ease: easing.default },
  } as TargetAndTransition,
  whileTap: {
    y: 0,
    scale: 0.98,
    boxShadow: '0 1px 4px rgba(0, 0, 0, 0.06)',
    transition: { duration: duration.instant },
  } as TargetAndTransition,
}

/**
 * Primary button interaction (more pronounced)
 */
export const buttonPrimary = {
  whileHover: {
    y: -2,
    boxShadow: '0 8px 20px rgba(0, 0, 0, 0.12), 0 4px 8px rgba(0, 0, 0, 0.06)',
    transition: { duration: duration.fast, ease: easing.default },
  } as TargetAndTransition,
  whileTap: {
    y: 0,
    scale: 0.98,
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
    transition: { duration: duration.instant },
  } as TargetAndTransition,
}

/**
 * Ghost/outline button interaction
 */
export const buttonGhost = {
  whileHover: {
    backgroundColor: 'rgba(0, 0, 0, 0.04)',
    transition: { duration: duration.fast },
  } as TargetAndTransition,
  whileTap: {
    scale: 0.98,
    backgroundColor: 'rgba(0, 0, 0, 0.06)',
    transition: { duration: duration.instant },
  } as TargetAndTransition,
}

/**
 * Icon button interaction (smaller scale)
 */
export const buttonIcon = {
  whileHover: {
    scale: 1.05,
    backgroundColor: 'rgba(0, 0, 0, 0.04)',
    transition: { duration: duration.fast },
  } as TargetAndTransition,
  whileTap: {
    scale: 0.95,
    transition: { duration: duration.instant },
  } as TargetAndTransition,
}

// =============================================================================
// CARD INTERACTIONS (Desktop-focused)
// =============================================================================

/**
 * Card hover with subtle glow (desktop only via CSS media query)
 * Usage: <motion.div {...cardHover} className="@media(hover:hover)" />
 */
export const cardHover = {
  whileHover: {
    y: -2,
    boxShadow: '0 8px 30px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(0, 0, 0, 0.04)',
    transition: { duration: duration.normal, ease: easing.default },
  } as TargetAndTransition,
}

/**
 * Card with border brighten on hover
 */
export const cardBorderHover = {
  whileHover: {
    borderColor: 'rgba(101, 163, 185, 0.3)',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.06)',
    transition: { duration: duration.normal, ease: easing.default },
  } as TargetAndTransition,
}

/**
 * Interactive card (clickable)
 */
export const cardInteractive = {
  whileHover: {
    y: -2,
    borderColor: 'rgba(101, 163, 185, 0.4)',
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(101, 163, 185, 0.1)',
    transition: { duration: duration.normal, ease: easing.default },
  } as TargetAndTransition,
  whileTap: {
    y: 0,
    scale: 0.99,
    transition: { duration: duration.instant },
  } as TargetAndTransition,
}

/**
 * Selected card state animation
 */
export const cardSelected: Variants = {
  initial: {
    borderColor: 'rgba(0, 0, 0, 0.1)',
    backgroundColor: 'rgba(255, 255, 255, 1)',
  },
  selected: {
    borderColor: 'var(--primary)',
    backgroundColor: 'rgba(101, 163, 185, 0.05)',
    transition: { duration: duration.fast },
  },
}

// =============================================================================
// PAGE TRANSITIONS (Fast fade/slide)
// =============================================================================

/**
 * Fast page transition for flows
 * Optimized for perceived speed
 */
export const pageTransitionFast: Variants = {
  initial: {
    opacity: 0,
    x: 8,
  },
  animate: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.2,
      ease: easing.out,
    },
  },
  exit: {
    opacity: 0,
    x: -8,
    transition: {
      duration: 0.15,
      ease: easing.in,
    },
  },
}

/**
 * Directional page transition (for step flows)
 * Use with custom={direction} where direction is 1 (forward) or -1 (back)
 */
export const pageTransitionDirectional = {
  enter: (direction: number) => ({
    x: direction > 0 ? 20 : -20,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
    transition: {
      duration: 0.2,
      ease: easing.out,
    },
  },
  exit: (direction: number) => ({
    x: direction < 0 ? 20 : -20,
    opacity: 0,
    transition: {
      duration: 0.15,
      ease: easing.in,
    },
  }),
}

/**
 * Fade only transition (minimal, fast)
 */
export const fadeTransition: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.15 } },
  exit: { opacity: 0, transition: { duration: 0.1 } },
}

// =============================================================================
// FORM ELEMENT ANIMATIONS
// =============================================================================

/**
 * Input focus animation
 */
export const inputFocus = {
  whileFocus: {
    boxShadow: '0 0 0 3px rgba(101, 163, 185, 0.15)',
    borderColor: 'var(--primary)',
    transition: { duration: duration.fast },
  } as TargetAndTransition,
}

/**
 * Form field entrance (staggered)
 */
export const formFieldEntrance: Variants = {
  initial: { opacity: 0, y: 8 },
  animate: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.2, ease: easing.out },
  },
}

/**
 * Validation message animation
 */
export const validationMessage: Variants = {
  initial: { opacity: 0, y: -4, height: 0 },
  animate: { 
    opacity: 1, 
    y: 0, 
    height: 'auto',
    transition: { duration: 0.15, ease: easing.out },
  },
  exit: { 
    opacity: 0, 
    y: -4, 
    height: 0,
    transition: { duration: 0.1 },
  },
}

// =============================================================================
// LOADING ANIMATIONS
// =============================================================================

/**
 * Spinner rotation (use with animate prop directly)
 */
export const spinnerRotation = {
  animate: {
    rotate: 360,
  },
  transition: {
    duration: 1,
    repeat: Infinity,
    ease: 'linear',
  },
}

/**
 * Pulse animation for loading states
 */
export const loadingPulse: Variants = {
  initial: { opacity: 0.5 },
  animate: {
    opacity: [0.5, 1, 0.5],
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
}

/**
 * Skeleton shimmer direction
 */
export const skeletonShimmer = {
  animate: {
    backgroundPosition: ['200% 0', '-200% 0'],
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: 'linear',
    },
  },
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Create custom stagger configuration
 */
export function createStagger(delay = staggerDelay.normal, initialDelay = 0.1) {
  return {
    container: {
      initial: {},
      animate: {
        transition: {
          staggerChildren: delay,
          delayChildren: initialDelay,
        },
      },
    } as Variants,
    item: fadeUp,
  }
}

/**
 * Create variants with custom delay
 */
export function withDelay<T extends Variants>(variants: T, delay: number): T {
  const result = { ...variants } as T & { animate?: { transition?: object } }
  if (result.animate && typeof result.animate === 'object') {
    result.animate = {
      ...result.animate,
      transition: {
        ...(result.animate.transition || {}),
        delay,
      },
    }
  }
  return result as T
}

/**
 * Create fade up with custom distance
 */
export function createFadeUp(distance = 16): Variants {
  return {
    initial: { opacity: 0, y: distance },
    animate: { opacity: 1, y: 0, transition: spring.smooth },
    exit: { opacity: 0, y: -distance / 2, transition: transition.fast },
  }
}

// =============================================================================
// ANIMATION PROPS SHORTCUTS
// =============================================================================

/**
 * Standard animation props for common patterns
 * Usage: <motion.div {...animateProps.fadeIn} />
 */
export const animateProps = {
  fadeIn: {
    initial: 'initial',
    animate: 'animate',
    exit: 'exit',
    variants: fadeIn,
  },
  fadeUp: {
    initial: 'initial',
    animate: 'animate',
    exit: 'exit',
    variants: fadeUp,
  },
  pageIn: {
    initial: 'initial',
    animate: 'animate',
    exit: 'exit',
    variants: pageIn,
  },
  scaleIn: {
    initial: 'initial',
    animate: 'animate',
    exit: 'exit',
    variants: scaleIn,
  },
} as const

// =============================================================================
// REDUCED MOTION VARIANTS
// =============================================================================

/**
 * Reduced motion safe variants
 * These only use opacity, no transforms
 */
export const reduced = {
  fadeIn: {
    initial: { opacity: 0 },
    animate: { opacity: 1, transition: { duration: 0.15 } },
    exit: { opacity: 0, transition: { duration: 0.1 } },
  } as Variants,
  
  // No-op for hover/tap when reduced motion is preferred
  hover: {} as const,
  tap: {} as const,
}

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type { Variants, Transition, TargetAndTransition }
