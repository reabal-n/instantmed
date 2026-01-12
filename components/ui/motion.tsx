/* eslint-disable @typescript-eslint/no-explicit-any -- Framer Motion wrapper requires type assertions for HTMLAttributes compatibility */
"use client"

import * as React from "react"
import { motion, type Variants, type Transition, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"

/**
 * InstantMed Motion System
 * 
 * Motion exists to confirm, not to impress.
 * All animation is slow, intentional, and subtle.
 * No bounce, snap, or aggressive acceleration.
 */

// ===========================================
// LUMEN MOTION PRESETS (Calm, Intentional)
// ===========================================

export const springPresets = {
  /** Gentle - for most interactions (default) */
  gentle: {
    type: "spring",
    stiffness: 200,
    damping: 30,
    mass: 1,
  } as Transition,
  
  /** Calm - for modals, page transitions */
  calm: {
    type: "spring",
    stiffness: 150,
    damping: 25,
    mass: 1,
  } as Transition,
  
  /** Smooth - for subtle movements */
  smooth: {
    type: "spring",
    stiffness: 120,
    damping: 20,
    mass: 1,
  } as Transition,
  
  /** @deprecated Use gentle instead - kept for backwards compat */
  snappy: {
    type: "spring",
    stiffness: 200,
    damping: 30,
    mass: 1,
  } as Transition,
  
  /** @deprecated Use gentle instead - kept for backwards compat */
  bouncy: {
    type: "spring",
    stiffness: 200,
    damping: 30,
    mass: 1,
  } as Transition,
}

// Lumen easing functions (CSS-compatible)
export const lumenEasing = {
  standard: [0.4, 0, 0.2, 1] as [number, number, number, number],
  gentle: [0.25, 0.1, 0.25, 1] as [number, number, number, number],
  calm: [0.33, 0, 0.2, 1] as [number, number, number, number],
}

// Lumen durations
export const lumenDurations = {
  fast: 0.2,      // 200ms
  normal: 0.3,    // 300ms
  slow: 0.4,      // 400ms
  slower: 0.5,    // 500ms
}

// ===========================================
// VARIANT PRESETS
// ===========================================

/** Hover variants for interactive elements - Lumen: subtle, not energetic */
export const hoverVariants: Variants = {
  rest: { 
    scale: 1,
    y: 0,
  },
  hover: { 
    scale: 1.01,
    y: -2,
    transition: {
      duration: lumenDurations.normal,
      ease: lumenEasing.gentle,
    },
  },
  tap: { 
    scale: 0.99,
    y: 0,
    transition: { duration: lumenDurations.fast },
  },
}

/** Modal/dialog entrance variants - Lumen: slow, intentional */
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
      duration: lumenDurations.slow,
      ease: lumenEasing.gentle,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.98,
    y: 8,
    transition: { 
      duration: lumenDurations.fast, 
      ease: lumenEasing.standard,
    },
  },
}

/** Fade-in variants for content */
export const fadeInVariants: Variants = {
  hidden: { 
    opacity: 0,
  },
  visible: { 
    opacity: 1,
    transition: { duration: 0.3 },
  },
}

/** Slide-up variants for cards, list items - Lumen: gentle rise */
export const slideUpVariants: Variants = {
  hidden: { 
    opacity: 0, 
    y: 12,
  },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: {
      duration: lumenDurations.normal,
      ease: lumenEasing.gentle,
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

/** Stagger item for list children - Lumen: no scale, just opacity + position */
export const staggerItemVariants: Variants = {
  hidden: { 
    opacity: 0, 
    y: 12,
  },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: {
      duration: lumenDurations.normal,
      ease: lumenEasing.gentle,
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
        // Lumen Glass surface
        "bg-white/75 dark:bg-slate-900/60",
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
          duration: lumenDurations.normal,
          ease: lumenEasing.gentle,
        },
      } : undefined}
      whileTap={pressable ? { 
        scale: 0.99,
        transition: { duration: lumenDurations.fast },
      } : undefined}
      transition={{ duration: lumenDurations.normal, ease: lumenEasing.gentle, delay }}
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
  // Lumen glow styles - warm dawn tones
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
          transition={{ duration: 0.2 }}
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
 * Modal wrapper with spring entrance
 * Use for dialogs, sheets, popovers
 */
export function MotionModal({ children, isOpen, className, ...props }: MotionModalProps) {
  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <motion.div
          className={cn(
            // Lumen Glass elevated surface
            "bg-white/90 dark:bg-slate-900/85",
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
      transition={{ duration: lumenDurations.normal, ease: lumenEasing.gentle }}
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
  const [prefersReducedMotion, setPrefersReducedMotion] = React.useState(false)

  React.useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)")
    setPrefersReducedMotion(mediaQuery.matches)

    const handleChange = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches)
    }

    mediaQuery.addEventListener("change", handleChange)
    return () => mediaQuery.removeEventListener("change", handleChange)
  }, [])

  return prefersReducedMotion
}

/**
 * Get animation props based on reduced motion preference
 * Returns empty object if user prefers reduced motion
 */
export function useMotionProps(props: object) {
  const prefersReducedMotion = useReducedMotion()
  return prefersReducedMotion ? {} : props
}

// Re-export framer-motion essentials for convenience
export { motion, AnimatePresence }
export type { Variants, Transition }

