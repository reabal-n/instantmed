/**
 * InstantMed Animation Constants
 * 
 * Motion exists to confirm, not to impress.
 * All animation is slow, intentional, and subtle.
 * Respects prefers-reduced-motion.
 */

import type { Variants, Transition } from "framer-motion"

// Check for reduced motion preference
const prefersReducedMotion =
  typeof window !== "undefined"
    ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
    : false

// Helper function for reduced motion check
function getPrefersReducedMotion(): boolean {
  return prefersReducedMotion
}

// Lumen duration constants - intentionally slower
export const durations = {
  fast: 0.2,    // 200ms - quick confirmations
  normal: 0.3,  // 300ms - standard transitions
  slow: 0.4,    // 400ms - deliberate animations
  slower: 0.5,  // 500ms - page transitions
} as const

// Lumen easing functions - gentle, calm
export const easing = {
  easeOut: [0.25, 0.1, 0.25, 1] as [number, number, number, number],
  easeIn: [0.4, 0, 1, 1] as [number, number, number, number],
  easeInOut: [0.33, 0, 0.2, 1] as [number, number, number, number],
  gentle: [0.25, 0.1, 0.25, 1] as [number, number, number, number],
  spring: { type: "spring" as const, stiffness: 200, damping: 30 },
} as const

// Base transition
const baseTransition: Transition = {
  duration: durations.normal,
  ease: easing.easeOut,
}

// Reduced motion transition (opacity only)
const reducedTransition: Transition = {
  duration: durations.fast,
  ease: easing.easeOut,
}

/**
 * Fade In Animation
 * Simple opacity fade
 */
export const fadeIn: Variants = {
  initial: { opacity: 0 },
  animate: {
    opacity: 1,
    transition: getPrefersReducedMotion() ? reducedTransition : baseTransition,
  },
  exit: {
    opacity: 0,
    transition: { duration: durations.fast },
  },
}

/**
 * Slide Up Animation
 * Fade + slide up from bottom
 */
export const slideUp: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: {
    opacity: 1,
    y: 0,
    transition: getPrefersReducedMotion()
      ? reducedTransition
      : {
          duration: durations.normal,
          ease: easing.easeOut,
        },
  },
  exit: {
    opacity: 0,
    y: -10,
    transition: { duration: durations.fast },
  },
}

/**
 * Scale In Animation
 * Fade + scale from center
 */
export const scaleIn: Variants = {
  initial: { opacity: 0, scale: 0.95 },
  animate: {
    opacity: 1,
    scale: 1,
    transition: getPrefersReducedMotion()
      ? reducedTransition
      : {
          duration: durations.fast,
          ease: easing.easeOut,
        },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    transition: { duration: durations.fast },
  },
}

/**
 * Slide In From Right
 * For modals, drawers, sidebars
 */
export const slideInRight: Variants = {
  initial: { opacity: 0, x: 100 },
  animate: {
    opacity: 1,
    x: 0,
    transition: getPrefersReducedMotion()
      ? reducedTransition
      : {
          duration: durations.normal,
          ease: easing.easeOut,
        },
  },
  exit: {
    opacity: 0,
    x: 100,
    transition: { duration: durations.fast },
  },
}

/**
 * Slide In From Left
 * For navigation, back actions
 */
export const slideInLeft: Variants = {
  initial: { opacity: 0, x: -100 },
  animate: {
    opacity: 1,
    x: 0,
    transition: getPrefersReducedMotion()
      ? reducedTransition
      : {
          duration: durations.normal,
          ease: easing.easeOut,
        },
  },
  exit: {
    opacity: 0,
    x: -100,
    transition: { duration: durations.fast },
  },
}

/**
 * Stagger Container
 * For animating lists
 */
export const staggerContainer: Variants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1,
    },
  },
  exit: {
    transition: {
      staggerChildren: 0.02,
      staggerDirection: -1,
    },
  },
}

/**
 * Stagger Item (uses slideUp)
 */
export const staggerItem = slideUp

/**
 * Page Transition
 * For route changes
 */
export const pageTransition: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: {
    opacity: 1,
    y: 0,
    transition: getPrefersReducedMotion()
      ? reducedTransition
      : {
          duration: durations.slower,
          ease: easing.easeOut,
        },
  },
  exit: {
    opacity: 0,
    y: -10,
    transition: { duration: durations.fast },
  },
}

/**
 * Modal/Dialog Animation - Lumen: slow, intentional
 * Gentle fade + minimal movement
 */
export const modalAnimation: Variants = {
  initial: { opacity: 0, scale: 0.98, y: 8 },
  animate: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: getPrefersReducedMotion()
      ? reducedTransition
      : {
          duration: durations.slow,
          ease: easing.gentle,
        },
  },
  exit: {
    opacity: 0,
    scale: 0.98,
    y: 8,
    transition: { duration: durations.fast },
  },
}

/**
 * Bottom Sheet Animation - Lumen: smooth slide
 * Slide up from bottom
 */
export const bottomSheetAnimation: Variants = {
  initial: { y: "100%" },
  animate: {
    y: 0,
    transition: prefersReducedMotion
      ? reducedTransition
      : {
          duration: durations.slow,
          ease: easing.gentle,
        },
  },
  exit: {
    y: "100%",
    transition: { duration: durations.normal, ease: easing.easeOut },
  },
}

/**
 * Hover Lift Animation - Lumen: subtle, not energetic
 * For cards, buttons
 */
export const hoverLift = {
  y: -2,
  transition: { duration: durations.normal, ease: easing.gentle },
}

/**
 * Press Animation - Lumen: minimal, confirmatory
 * For button clicks
 */
export const press = {
  y: 0,
  transition: { duration: durations.fast },
}

/**
 * Animation Props Helper
 * Quick way to apply animations
 */
export const animationProps = {
  fadeIn: {
    initial: "initial",
    animate: "animate",
    exit: "exit",
    variants: fadeIn,
  },
  slideUp: {
    initial: "initial",
    animate: "animate",
    exit: "exit",
    variants: slideUp,
  },
  scaleIn: {
    initial: "initial",
    animate: "animate",
    exit: "exit",
    variants: scaleIn,
  },
  pageTransition: {
    initial: "initial",
    animate: "animate",
    exit: "exit",
    variants: pageTransition,
  },
} as const

/**
 * Reduced Motion Variants
 * Use when user prefers reduced motion
 */
export const reducedMotion = {
  fadeIn: {
    initial: { opacity: 0 },
    animate: { opacity: 1, transition: reducedTransition },
    exit: { opacity: 0, transition: { duration: durations.fast } },
  },
  // No transforms for reduced motion
  slideUp: {
    initial: { opacity: 0 },
    animate: { opacity: 1, transition: reducedTransition },
    exit: { opacity: 0, transition: { duration: durations.fast } },
  },
  scaleIn: {
    initial: { opacity: 0 },
    animate: { opacity: 1, transition: reducedTransition },
    exit: { opacity: 0, transition: { duration: durations.fast } },
  },
} as const

