'use client'

import * as React from 'react'
import { motion, useReducedMotion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

// =============================================================================
// TYPES
// =============================================================================

export interface AnimatedHeroProps {
  /** Main headline - can include a rotating word slot */
  title: React.ReactNode
  /** Supporting text below the headline */
  subtitle?: string
  /** Badge/pill text above the headline */
  badge?: React.ReactNode
  /** Primary CTA button */
  primaryCta?: React.ReactNode
  /** Secondary CTA button */
  secondaryCta?: React.ReactNode
  /** Trust indicators or social proof */
  trustIndicators?: React.ReactNode
  /** Right side content (image, cards, etc.) */
  heroContent?: React.ReactNode
  /** Custom className */
  className?: string
  /** Animation delay for stagger effect */
  animationDelay?: number
}

export interface RotatingWordsProps {
  /** Array of words to rotate through */
  words: string[]
  /** Interval between word changes (ms) */
  interval?: number
  /** Custom className */
  className?: string
}

export interface GradientTextProps {
  children: React.ReactNode
  /** Gradient CSS or preset */
  gradient?: string
  className?: string
}

export interface FloatingElementProps {
  children: React.ReactNode
  /** Float distance in pixels */
  distance?: number
  /** Animation duration in seconds */
  duration?: number
  /** Delay before animation starts */
  delay?: number
  className?: string
}

// =============================================================================
// ANIMATION VARIANTS
// =============================================================================

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.1,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.2,
      ease: "easeOut",
    },
  },
}

const wordVariants = {
  enter: {
    y: 20,
    opacity: 0,
    scale: 0.95,
    filter: 'blur(4px)',
  },
  center: {
    y: 0,
    opacity: 1,
    scale: 1,
    filter: 'blur(0px)',
    transition: {
      duration: 0.18,
      ease: "easeOut",
    },
  },
  exit: {
    y: -20,
    opacity: 0,
    scale: 0.95,
    filter: 'blur(4px)',
    transition: {
      duration: 0.2,
    },
  },
}

const reducedWordVariants = {
  enter: { opacity: 0 },
  center: { opacity: 1, transition: { duration: 0.3 } },
  exit: { opacity: 0, transition: { duration: 0.1 } },
}

// =============================================================================
// ROTATING WORDS
// =============================================================================

export function RotatingWords({
  words,
  interval = 3000,
  className,
}: RotatingWordsProps) {
  const [currentIndex, setCurrentIndex] = React.useState(0)
  const shouldReduceMotion = useReducedMotion()
  const reducedMotion = shouldReduceMotion ?? false

  React.useEffect(() => {
    if (words.length <= 1) return

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % words.length)
    }, interval)

    return () => clearInterval(timer)
  }, [words.length, interval])

  const variants = reducedMotion ? reducedWordVariants : wordVariants

  return (
    <span className={cn('relative inline-block', className)}>
      <AnimatePresence mode="wait">
        <motion.span
          key={currentIndex}
          variants={variants}
          initial="enter"
          animate="center"
          exit="exit"
          className="inline-block"
        >
          {words[currentIndex]}
        </motion.span>
      </AnimatePresence>
    </span>
  )
}

// =============================================================================
// GRADIENT TEXT
// =============================================================================

export function GradientText({
  children,
  gradient = 'linear-gradient(135deg, var(--primary) 0%, oklch(0.65 0.15 280) 100%)',
  className,
}: GradientTextProps) {
  return (
    <span
      className={cn('bg-clip-text text-transparent', className)}
      style={{
        backgroundImage: gradient,
      }}
    >
      {children}
    </span>
  )
}

// =============================================================================
// FLOATING ELEMENT
// =============================================================================

export function FloatingElement({
  children,
  distance = 10,
  duration = 3,
  delay = 0,
  className,
}: FloatingElementProps) {
  const shouldReduceMotion = useReducedMotion()
  
  if (shouldReduceMotion) {
    return <div className={className}>{children}</div>
  }

  return (
    <motion.div
      className={className}
      animate={{
        y: [0, -distance, 0],
      }}
      transition={{
        duration,
        repeat: Infinity,
        ease: 'easeInOut',
        delay,
      }}
    >
      {children}
    </motion.div>
  )
}

// =============================================================================
// ANIMATED BACKGROUND GRADIENT
// =============================================================================

export function AnimatedGradientBg({ className }: { className?: string }) {
  const shouldReduceMotion = useReducedMotion()
  
  if (shouldReduceMotion) {
    return (
      <div
        className={cn(
          'absolute inset-0 pointer-events-none',
          className
        )}
        style={{
          background: 'radial-gradient(ellipse at center, oklch(0.65 0.15 185 / 0.1) 0%, transparent 70%)',
        }}
      />
    )
  }

  return (
    <div className={cn('absolute inset-0 pointer-events-none overflow-hidden', className)}>
      {/* Primary blob */}
      <motion.div
        className="absolute top-0 left-1/4 w-[500px] h-[500px] rounded-full"
        style={{
          background: 'radial-gradient(circle, oklch(0.65 0.15 185 / 0.10) 0%, transparent 70%)',
          filter: 'blur(60px)',
        }}
        animate={{
          x: [0, 15, 0],
          y: [0, -10, 0],
          scale: [1, 1.05, 1],
        }}
        transition={{
          duration: 15,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
      
      {/* Secondary blob */}
      <motion.div
        className="absolute bottom-0 right-1/4 w-[400px] h-[400px] rounded-full"
        style={{
          background: 'radial-gradient(circle, oklch(0.6 0.12 280 / 0.08) 0%, transparent 70%)',
          filter: 'blur(50px)',
        }}
        animate={{
          x: [0, -10, 0],
          y: [0, 10, 0],
          scale: [1.05, 1, 1.05],
        }}
        transition={{
          duration: 18,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
      
      {/* Center glow */}
      <motion.div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full"
        style={{
          background: 'radial-gradient(circle, oklch(0.7 0.1 200 / 0.05) 0%, transparent 60%)',
          filter: 'blur(80px)',
        }}
        animate={{
          scale: [1, 1.08, 1],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
    </div>
  )
}

// =============================================================================
// ANIMATED HERO
// =============================================================================

export function AnimatedHero({
  title,
  subtitle,
  badge,
  primaryCta,
  secondaryCta,
  trustIndicators,
  heroContent,
  className,
  animationDelay = 0,
}: AnimatedHeroProps) {
  const shouldReduceMotion = useReducedMotion()

  return (
    <section
      className={cn(
        'relative min-h-[calc(100vh-4rem)] pt-24 pb-16 md:pt-32 md:pb-24 overflow-hidden',
        className
      )}
    >
      {/* Animated background */}
      <AnimatedGradientBg />

      <div className="container mx-auto px-4 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center min-h-[calc(100vh-12rem)]">
          {/* Text Content */}
          <motion.div
            variants={shouldReduceMotion ? undefined : containerVariants}
            initial="hidden"
            animate="visible"
            className="order-2 lg:order-1"
            style={{ transitionDelay: `${animationDelay}ms` }}
          >
            {/* Badge */}
            {badge && (
              <motion.div variants={itemVariants} className="mb-6">
                {badge}
              </motion.div>
            )}

            {/* Title */}
            <motion.h1
              variants={itemVariants}
              className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6 leading-[1.1]"
            >
              {title}
            </motion.h1>

            {/* Subtitle */}
            {subtitle && (
              <motion.p
                variants={itemVariants}
                className="text-lg md:text-xl text-muted-foreground mb-8 max-w-lg leading-relaxed"
              >
                {subtitle}
              </motion.p>
            )}

            {/* CTAs */}
            {(primaryCta || secondaryCta) && (
              <motion.div
                variants={itemVariants}
                className="flex flex-col sm:flex-row gap-3 mb-8"
              >
                {primaryCta}
                {secondaryCta}
              </motion.div>
            )}

            {/* Trust Indicators */}
            {trustIndicators && (
              <motion.div variants={itemVariants}>
                {trustIndicators}
              </motion.div>
            )}
          </motion.div>

          {/* Hero Content (right side) */}
          {heroContent && (
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{
                delay: 0.3 + animationDelay / 1000,
                duration: 0.6,
                ease: [0.16, 1, 0.3, 1],
              }}
              className="order-1 lg:order-2 flex justify-center lg:justify-end"
            >
              {heroContent}
            </motion.div>
          )}
        </div>
      </div>
    </section>
  )
}

// =============================================================================
// EXPORTS
// =============================================================================

export default AnimatedHero
