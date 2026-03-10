/* eslint-disable @typescript-eslint/no-explicit-any -- Framer Motion wrapper requires type assertions for HTMLAttributes compatibility */
"use client"

import * as React from "react"
import { motion, type Variants, type Transition, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import { duration, easing } from "@/lib/motion"

/**
 * InstantMed Motion System — React Components & Hooks
 *
 * Canonical motion presets live in `@/lib/motion`.
 * This file provides React wrapper components, hooks, and scroll config.
 *
 * Motion exists to confirm, not to impress.
 */

// ===========================================
// SCROLL REVEAL CONFIG (unique to this file)
// ===========================================

/** Scroll reveal defaults for IntersectionObserver-based animations */
export const scrollRevealConfig = {
  threshold: 0.15,
  once: true,
  margin: "-50px",
} as const;

// ===========================================
// VARIANT PRESETS (thin wrappers over lib/motion)
// ===========================================

/** Hover variants for interactive elements */
export const hoverVariants: Variants = {
  rest: {
    scale: 1,
    y: 0,
  },
  hover: {
    scale: 1.01,
    y: -2,
    transition: {
      duration: duration.normal,
      ease: easing.out,
    },
  },
  tap: {
    scale: 0.99,
    y: 0,
    transition: { duration: duration.fast },
  },
}

/** Modal/dialog entrance variants */
export const modalVariants: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.98,
    y: 8,
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      duration: duration.slow,
      ease: easing.out,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.98,
    y: 8,
    transition: {
      duration: duration.fast,
      ease: easing.out,
    },
  },
}

/** Slide-up variants for cards, list items */
export const slideUpVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 12,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: duration.normal,
      ease: easing.out,
    },
  },
}

/** Stagger container for lists */
export const staggerContainerVariants: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
}

/** Stagger item for list children */
export const staggerItemVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 12,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: duration.normal,
      ease: easing.out,
    },
  },
}

// ===========================================
// MOTION COMPONENTS
// ===========================================

interface MotionCardProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onAnimationStart' | 'transition'> {
  children: React.ReactNode
  /** Enable hover lift effect */
  hover?: boolean
  /** Enable press/tap effect */
  pressable?: boolean
  /** Custom delay for stagger animations */
  delay?: number
}

/**
 * Glass card with motion effects
 * Use for any interactive card component
 */
export function MotionCard({
  children,
  className,
  hover = true,
  pressable = false,
  delay = 0,
  ...props
}: MotionCardProps) {
  return (
    <motion.div
      className={cn(
        // Glass surface
        "bg-card/75 dark:bg-white/5",
        "backdrop-blur-xl",
        "border border-sky-300/35 dark:border-white/10",
        "rounded-2xl",
        "shadow-[0_4px_20px_rgba(197,221,240,0.15)]",
        className
      )}
      initial="hidden"
      animate="visible"
      variants={slideUpVariants}
      whileHover={hover ? {
        y: -2,
        boxShadow: "0 8px 30px rgba(197, 221, 240, 0.20)",
        transition: {
          duration: duration.normal,
          ease: easing.out,
        },
      } : undefined}
      whileTap={pressable ? {
        scale: 0.99,
        transition: { duration: duration.fast },
      } : undefined}
      transition={{ duration: duration.normal, ease: easing.out, delay }}
      {...(props as any)}
    >
      {children}
    </motion.div>
  )
}

interface MotionButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onAnimationStart' | 'transition'> {
  children: React.ReactNode
  /** Glow color for hover state */
  glowColor?: "primary" | "accent" | "success" | "danger"
}

/**
 * Button with motion effects
 * Use for any interactive button
 */
export function MotionButton({
  children,
  className,
  glowColor = "primary",
  ...props
}: MotionButtonProps) {
  // Glow styles - warm dawn tones
  const glowStyles = {
    primary: "hover:shadow-[0_8px_30px_rgba(245,169,98,0.30)]",
    accent: "hover:shadow-[0_8px_30px_rgba(197,221,240,0.25)]",
    success: "hover:shadow-[0_8px_30px_rgba(107,191,138,0.25)]",
    danger: "hover:shadow-[0_8px_30px_rgba(224,122,122,0.25)]",
  }

  return (
    <motion.button
      className={cn(
        "font-sans font-semibold rounded-xl",
        "shadow-[0_4px_20px_rgba(245,169,98,0.25)]",
        glowStyles[glowColor],
        "transition-shadow duration-300",
        className
      )}
      variants={hoverVariants}
      initial="rest"
      whileHover="hover"
      whileTap="tap"
      {...(props as any)}
    >
      {children}
    </motion.button>
  )
}

interface MotionListProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onAnimationStart' | 'transition'> {
  children: React.ReactNode
}

/**
 * Stagger container for lists
 * Wrap list items with this for staggered animations
 */
export function MotionList({ children, className, ...props }: MotionListProps) {
  return (
    <motion.div
      className={className}
      variants={staggerContainerVariants}
      initial="hidden"
      animate="visible"
      {...(props as any)}
    >
      {children}
    </motion.div>
  )
}

interface MotionListItemProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onAnimationStart' | 'transition'> {
  children: React.ReactNode
}

/**
 * Stagger item for list children
 * Use as direct child of MotionList
 */
export function MotionListItem({ children, className, ...props }: MotionListItemProps) {
  return (
    <motion.div
      className={className}
      variants={staggerItemVariants}
      {...(props as any)}
    >
      {children}
    </motion.div>
  )
}

interface MotionFadeProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onAnimationStart' | 'transition'> {
  children: React.ReactNode
  /** Show/hide the content */
  show?: boolean
}

/**
 * Fade wrapper with AnimatePresence
 * Use for conditional content that fades in/out
 */
export function MotionFade({ children, show = true, className, ...props }: MotionFadeProps) {
  return (
    <AnimatePresence mode="wait">
      {show && (
        <motion.div
          className={className}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: duration.fast }}
          {...(props as any)}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

interface MotionModalProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onAnimationStart' | 'transition'> {
  children: React.ReactNode
  /** Control visibility */
  isOpen: boolean
}

/**
 * Modal wrapper with entrance animation
 * Use for dialogs, sheets, popovers
 */
export function MotionModal({ children, isOpen, className, ...props }: MotionModalProps) {
  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <motion.div
          className={cn(
            // Glass elevated surface
            "bg-card/90 dark:bg-white/10",
            "backdrop-blur-2xl",
            "border border-sky-300/45 dark:border-white/15",
            "rounded-3xl",
            "shadow-[0_20px_60px_rgba(197,221,240,0.30)]",
            className
          )}
          variants={modalVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          {...(props as any)}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

interface MotionScaleProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onAnimationStart' | 'transition'> {
  children: React.ReactNode
}

/**
 * Scale-in animation wrapper
 * Use for elements that pop in
 */
export function MotionScale({ children, className, ...props }: MotionScaleProps) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: duration.normal, ease: easing.out }}
      {...(props as any)}
    >
      {children}
    </motion.div>
  )
}

// ===========================================
// UTILITY HOOKS
// ===========================================

/**
 * Hook for reduced motion preference
 * Use to disable animations for users who prefer reduced motion
 */
export function useReducedMotion() {
  const [reduced, setReduced] = React.useState(false)

  React.useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)")
    setReduced(mediaQuery.matches)

    const handleChange = (event: MediaQueryListEvent) => {
      setReduced(event.matches)
    }

    mediaQuery.addEventListener("change", handleChange)
    return () => mediaQuery.removeEventListener("change", handleChange)
  }, [])

  return reduced
}

/**
 * Get animation props based on reduced motion preference
 * Returns empty object if user prefers reduced motion
 */
export function useMotionProps(props: object) {
  const reduced = useReducedMotion()
  return reduced ? {} : props
}

// Re-export framer-motion essentials for convenience
export { motion, AnimatePresence }
export type { Variants, Transition }
