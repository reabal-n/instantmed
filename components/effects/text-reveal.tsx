"use client"

import { useRef, ReactNode } from "react"
import { motion, useInView, Variants } from "framer-motion"
import { cn } from "@/lib/utils"

interface TextRevealProps {
  children: string
  className?: string
  delay?: number
  duration?: number
  staggerDelay?: number
  once?: boolean
  as?: "h1" | "h2" | "h3" | "h4" | "p" | "span"
}

// Character by character reveal
export function TextRevealChar({
  children,
  className,
  delay = 0,
  duration = 0.5,
  staggerDelay = 0.02,
  once = true,
  as: _Component = "span",
}: TextRevealProps) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once, margin: "-100px" })

  const characters = children.split("")

  const containerVariants: Variants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: staggerDelay,
        delayChildren: delay,
      },
    },
  }

  const charVariants: Variants = {
    hidden: {
      opacity: 0,
      y: 20,
      filter: "blur(10px)",
    },
    visible: {
      opacity: 1,
      y: 0,
      filter: "blur(0px)",
      transition: {
        duration,
        ease: [0.25, 0.4, 0.25, 1],
      },
    },
  }

  return (
    <motion.div
      ref={ref}
      variants={containerVariants}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      className={cn("inline-block", className)}
      aria-label={children}
    >
      {characters.map((char, index) => (
        <motion.span
          key={`${char}-${index}`}
          variants={charVariants}
          className="inline-block"
          style={{ whiteSpace: char === " " ? "pre" : "normal" }}
        >
          {char === " " ? "\u00A0" : char}
        </motion.span>
      ))}
    </motion.div>
  )
}

// Word by word reveal
export function TextRevealWord({
  children,
  className,
  delay = 0,
  duration = 0.5,
  staggerDelay = 0.08,
  once = true,
}: TextRevealProps) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once, margin: "-100px" })

  const words = children.split(" ")

  const containerVariants: Variants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: staggerDelay,
        delayChildren: delay,
      },
    },
  }

  const wordVariants: Variants = {
    hidden: {
      opacity: 0,
      y: 30,
      rotateX: -90,
    },
    visible: {
      opacity: 1,
      y: 0,
      rotateX: 0,
      transition: {
        duration,
        ease: [0.25, 0.4, 0.25, 1],
      },
    },
  }

  return (
    <motion.div
      ref={ref}
      variants={containerVariants}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      className={cn("flex flex-wrap", className)}
      style={{ perspective: "1000px" }}
    >
      {words.map((word, index) => (
        <motion.span
          key={`${word}-${index}`}
          variants={wordVariants}
          className="inline-block mr-[0.25em]"
          style={{ transformOrigin: "bottom" }}
        >
          {word}
        </motion.span>
      ))}
    </motion.div>
  )
}

// Line reveal with mask
export function TextRevealLine({
  children,
  className,
  delay = 0,
  duration = 0.8,
  once = true,
}: {
  children: ReactNode
  className?: string
  delay?: number
  duration?: number
  once?: boolean
}) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once, margin: "-100px" })

  return (
    <div ref={ref} className={cn("overflow-hidden", className)}>
      <motion.div
        initial={{ y: "100%", opacity: 0 }}
        animate={isInView ? { y: "0%", opacity: 1 } : { y: "100%", opacity: 0 }}
        transition={{
          duration,
          delay,
          ease: [0.25, 0.4, 0.25, 1],
        }}
      >
        {children}
      </motion.div>
    </div>
  )
}

// Gradient text reveal with shimmer
export function TextRevealGradient({
  children,
  className,
  delay = 0,
  duration = 1.2,
  once = true,
}: Omit<TextRevealProps, "staggerDelay">) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once, margin: "-100px" })

  return (
    <div ref={ref} className={cn("relative", className)}>
      <motion.span
        initial={{ opacity: 0, backgroundPosition: "200% center" }}
        animate={
          isInView
            ? { opacity: 1, backgroundPosition: "-200% center" }
            : { opacity: 0, backgroundPosition: "200% center" }
        }
        transition={{
          opacity: { duration: 0.5, delay },
          backgroundPosition: { duration: duration * 2, delay, repeat: Infinity },
        }}
        className="bg-linear-to-r from-[#00E2B5] via-[#06B6D4] via-[#8B5CF6] via-[#06B6D4] to-[#00E2B5] bg-size-[200%_auto] bg-clip-text text-transparent"
      >
        {children}
      </motion.span>
    </div>
  )
}

// Typewriter effect
interface TypewriterProps {
  text: string
  className?: string
  delay?: number
  speed?: number
  cursor?: boolean
  onComplete?: () => void
}

export function Typewriter({
  text,
  className,
  delay = 0,
  speed = 50,
  cursor = true,
  onComplete,
}: TypewriterProps) {
  const ref = useRef<HTMLSpanElement>(null)
  const isInView = useInView(ref, { once: true, margin: "-100px" })

  return (
    <span ref={ref} className={cn("inline-block", className)}>
      {isInView && (
        <>
          <motion.span
            initial={{ width: 0 }}
            animate={{ width: "auto" }}
            transition={{
              duration: (text.length * speed) / 1000,
              delay,
              ease: "linear",
            }}
            className="inline-block overflow-hidden whitespace-nowrap"
            onAnimationComplete={onComplete}
          >
            {text}
          </motion.span>
          {cursor && (
            <motion.span
              animate={{ opacity: [1, 0] }}
              transition={{ duration: 0.5, repeat: Infinity, repeatType: "reverse" }}
              className="inline-block w-[2px] h-[1em] bg-current ml-1 align-middle"
            />
          )}
        </>
      )}
    </span>
  )
}
