'use client'

import * as React from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { duration, easing } from '@/lib/motion'

// =============================================================================
// TYPES
// =============================================================================

export interface RotatingTextProps {
  /** Array of words/phrases to rotate through */
  words: string[]
  /** Interval between rotations in ms */
  interval?: number
  /** Animation style */
  animation?: 'slide' | 'fade' | 'blur' | 'flip'
  /** Custom className for the container */
  className?: string
  /** Custom className for each word */
  wordClassName?: string
}

// =============================================================================
// ANIMATION VARIANTS
// =============================================================================

const animations = {
  slide: {
    initial: { y: 20, opacity: 0 },
    animate: { y: 0, opacity: 1 },
    exit: { y: -20, opacity: 0 },
  },
  fade: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
  },
  blur: {
    initial: { opacity: 0, filter: 'blur(8px)' },
    animate: { opacity: 1, filter: 'blur(0px)' },
    exit: { opacity: 0, filter: 'blur(8px)' },
  },
  flip: {
    initial: { rotateX: 90, opacity: 0 },
    animate: { rotateX: 0, opacity: 1 },
    exit: { rotateX: -90, opacity: 0 },
  },
}

const reducedAnimations = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
}

// =============================================================================
// ROTATING TEXT COMPONENT
// =============================================================================

export function RotatingText({
  words,
  interval = 3000,
  animation = 'slide',
  className,
  wordClassName,
}: RotatingTextProps) {
  const [currentIndex, setCurrentIndex] = React.useState(0)
  const shouldReduceMotion = useReducedMotion()
  const reducedMotion = shouldReduceMotion ?? false

  // Rotate through words
  React.useEffect(() => {
    if (words.length <= 1) return

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % words.length)
    }, interval)

    return () => clearInterval(timer)
  }, [words.length, interval])

  const variants = reducedMotion ? reducedAnimations : animations[animation]
  const transitionDuration = reducedMotion ? 0.1 : duration.normal

  return (
    <span className={cn('relative inline-block overflow-hidden', className)}>
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={currentIndex}
          initial="initial"
          animate="animate"
          exit="exit"
          variants={variants}
          transition={{
            duration: transitionDuration,
            ease: easing.out,
          }}
          className={cn(
            'inline-block',
            wordClassName
          )}
          style={{
            transformStyle: animation === 'flip' ? 'preserve-3d' : undefined,
          }}
        >
          {words[currentIndex]}
        </motion.span>
      </AnimatePresence>
    </span>
  )
}

// =============================================================================
// TYPEWRITER EFFECT (alternative)
// =============================================================================

export interface TypewriterProps {
  /** Array of phrases to type */
  phrases: string[]
  /** Typing speed in ms per character */
  typeSpeed?: number
  /** Delete speed in ms per character */
  deleteSpeed?: number
  /** Pause duration after typing complete */
  pauseDuration?: number
  /** Custom className */
  className?: string
  /** Show cursor */
  showCursor?: boolean
}

export function Typewriter({
  phrases,
  typeSpeed = 50,
  deleteSpeed = 30,
  pauseDuration = 2000,
  className,
  showCursor = true,
}: TypewriterProps) {
  const [currentPhraseIndex, setCurrentPhraseIndex] = React.useState(0)
  const [currentText, setCurrentText] = React.useState('')
  const [isDeleting, setIsDeleting] = React.useState(false)
  const shouldReduceMotion = useReducedMotion()

  React.useEffect(() => {
    // If reduced motion, just show full text without animation
    if (shouldReduceMotion) {
      setCurrentText(phrases[currentPhraseIndex])
      const interval = setInterval(() => {
        setCurrentPhraseIndex((prev) => (prev + 1) % phrases.length)
      }, pauseDuration)
      return () => clearInterval(interval)
    }

    const currentPhrase = phrases[currentPhraseIndex]

    const timeout = setTimeout(() => {
      if (!isDeleting) {
        // Typing
        if (currentText.length < currentPhrase.length) {
          setCurrentText(currentPhrase.slice(0, currentText.length + 1))
        } else {
          // Pause before deleting
          setTimeout(() => setIsDeleting(true), pauseDuration)
        }
      } else {
        // Deleting
        if (currentText.length > 0) {
          setCurrentText(currentText.slice(0, -1))
        } else {
          setIsDeleting(false)
          setCurrentPhraseIndex((prev) => (prev + 1) % phrases.length)
        }
      }
    }, isDeleting ? deleteSpeed : typeSpeed)

    return () => clearTimeout(timeout)
  }, [currentText, isDeleting, currentPhraseIndex, phrases, typeSpeed, deleteSpeed, pauseDuration, shouldReduceMotion])

  return (
    <span className={cn('inline-block', className)}>
      {currentText}
      {showCursor && (
        <span 
          className="inline-block w-0.5 h-[1em] bg-primary ml-0.5 animate-pulse"
          style={{ verticalAlign: 'text-bottom' }}
        />
      )}
    </span>
  )
}

// =============================================================================
// WORD REVEAL (staggered letter animation)
// =============================================================================

export interface WordRevealProps {
  /** Text to reveal */
  text: string
  /** Delay between each letter */
  staggerDelay?: number
  /** Custom className for container */
  className?: string
  /** Custom className for each letter */
  letterClassName?: string
  /** Play animation when in view */
  animateOnView?: boolean
}

export function WordReveal({
  text,
  staggerDelay = 0.03,
  className,
  letterClassName,
  animateOnView = true,
}: WordRevealProps) {
  const shouldReduceMotion = useReducedMotion()
  const letters = text.split('')

  if (shouldReduceMotion) {
    return <span className={className}>{text}</span>
  }

  return (
    <motion.span
      className={cn('inline-block', className)}
      initial="hidden"
      {...(animateOnView 
        ? { whileInView: 'visible', viewport: { once: true } }
        : { animate: 'visible' }
      )}
      variants={{
        hidden: {},
        visible: {
          transition: {
            staggerChildren: staggerDelay,
          },
        },
      }}
    >
      {letters.map((letter, index) => (
        <motion.span
          key={index}
          className={cn('inline-block', letterClassName)}
          variants={{
            hidden: { opacity: 0, y: 10 },
            visible: { 
              opacity: 1, 
              y: 0,
              transition: {
                duration: duration.fast,
                ease: easing.out,
              },
            },
          }}
        >
          {letter === ' ' ? '\u00A0' : letter}
        </motion.span>
      ))}
    </motion.span>
  )
}
