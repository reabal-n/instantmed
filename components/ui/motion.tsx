"use client"

import * as React from "react"
import { motion, type Variants, type Transition, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"

/**
 * Soft Pop Glass Motion System
 * 
 * Spring physics presets and animation utilities for the design system.
 * All interactive elements should use these for consistent feel.
 */

// ===========================================
// SPRING PHYSICS PRESETS (Linear Style)
// ===========================================

export const springPresets = {
  /** Snappy spring - for buttons, small interactions */
  snappy: {
    type: "spring",
    stiffness: 400,
    damping: 30,
  } as Transition,
  
  /** Bouncy spring - for celebratory animations */
  bouncy: {
    type: "spring",
    stiffness: 300,
    damping: 20,
  } as Transition,
  
  /** Smooth spring - for page transitions, modals */
  smooth: {
    type: "spring",
    stiffness: 200,
    damping: 25,
  } as Transition,
  
  /** Gentle spring - for subtle movements */
  gentle: {
    type: "spring",
    stiffness: 150,
    damping: 20,
  } as Transition,
}

// ===========================================
// VARIANT PRESETS
// ===========================================

/** Hover variants for interactive elements */
export const hoverVariants: Variants = {
  rest: { 
    scale: 1,
  },
  hover: { 
    scale: 1.02,
    transition: springPresets.snappy,
  },
  tap: { 
    scale: 0.98,
    transition: { duration: 0.1 },
  },
}

/** Modal/dialog entrance variants */
export const modalVariants: Variants = {
  hidden: { 
    opacity: 0, 
    scale: 0.95,
    y: 20,
  },
  visible: { 
    opacity: 1, 
    scale: 1,
    y: 0,
    transition: springPresets.smooth,
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    y: 20,
    transition: { duration: 0.2, ease: "easeOut" },
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

/** Slide-up variants for cards, list items */
export const slideUpVariants: Variants = {
  hidden: { 
    opacity: 0, 
    y: 20,
  },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: springPresets.gentle,
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
    y: 20,
    scale: 0.95,
  },
  visible: { 
    opacity: 1, 
    y: 0,
    scale: 1,
    transition: springPresets.gentle,
  },
}

// ===========================================
// MOTION COMPONENTS
// ===========================================

interface MotionCardProps extends React.HTMLAttributes<HTMLDivElement> {
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
        // Soft Pop Glass surface
        "bg-white/70 dark:bg-gray-900/60",
        "backdrop-blur-xl",
        "border border-white/40 dark:border-white/10",
        "rounded-2xl",
        "shadow-[0_8px_30px_rgba(0,0,0,0.06)]",
        className
      )}
      initial="hidden"
      animate="visible"
      variants={slideUpVariants}
      whileHover={hover ? { 
        y: -4, 
        scale: 1.01,
        boxShadow: "0 20px 40px rgba(59, 130, 246, 0.12)",
        transition: springPresets.snappy,
      } : undefined}
      whileTap={pressable ? { 
        scale: 0.98,
        transition: { duration: 0.1 },
      } : undefined}
      transition={{ ...springPresets.gentle, delay }}
      {...props}
    >
      {children}
    </motion.div>
  )
}

interface MotionButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
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
  const glowStyles = {
    primary: "hover:shadow-[0_12px_40px_rgba(59,130,246,0.35)]",
    accent: "hover:shadow-[0_12px_40px_rgba(139,92,246,0.35)]",
    success: "hover:shadow-[0_12px_40px_rgba(34,197,94,0.35)]",
    danger: "hover:shadow-[0_12px_40px_rgba(239,68,68,0.35)]",
  }

  return (
    <motion.button
      className={cn(
        "font-semibold rounded-full",
        "shadow-[0_8px_30px_rgba(59,130,246,0.25)]",
        glowStyles[glowColor],
        "transition-shadow duration-200",
        className
      )}
      variants={hoverVariants}
      initial="rest"
      whileHover="hover"
      whileTap="tap"
      {...props}
    >
      {children}
    </motion.button>
  )
}

interface MotionListProps extends React.HTMLAttributes<HTMLDivElement> {
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
      {...props}
    >
      {children}
    </motion.div>
  )
}

interface MotionListItemProps extends React.HTMLAttributes<HTMLDivElement> {
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
      {...props}
    >
      {children}
    </motion.div>
  )
}

interface MotionFadeProps extends React.HTMLAttributes<HTMLDivElement> {
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
          {...props}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

interface MotionModalProps extends React.HTMLAttributes<HTMLDivElement> {
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
            // Soft Pop Glass elevated surface
            "bg-white/85 dark:bg-gray-900/80",
            "backdrop-blur-2xl",
            "border border-white/50 dark:border-white/15",
            "rounded-3xl",
            "shadow-[0_25px_60px_rgba(0,0,0,0.15)]",
            className
          )}
          variants={modalVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          {...props}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

interface MotionScaleProps extends React.HTMLAttributes<HTMLDivElement> {
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
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={springPresets.bouncy}
      {...props}
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

