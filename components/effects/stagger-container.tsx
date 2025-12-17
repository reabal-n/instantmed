"use client"

import { ReactNode, Children, isValidElement, useRef, useEffect, useState } from "react"
import { motion, useInView, Variants } from "framer-motion"
import { cn } from "@/lib/utils"

interface StaggerContainerProps {
  children: ReactNode
  className?: string
  staggerDelay?: number
  initialDelay?: number
  duration?: number
  once?: boolean
  animation?: "fade" | "slideUp" | "slideDown" | "slideLeft" | "slideRight" | "scale" | "blur"
  threshold?: number
}

const animations = {
  fade: {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
  },
  slideUp: {
    hidden: { opacity: 0, y: 40 },
    visible: { opacity: 1, y: 0 },
  },
  slideDown: {
    hidden: { opacity: 0, y: -40 },
    visible: { opacity: 1, y: 0 },
  },
  slideLeft: {
    hidden: { opacity: 0, x: 40 },
    visible: { opacity: 1, x: 0 },
  },
  slideRight: {
    hidden: { opacity: 0, x: -40 },
    visible: { opacity: 1, x: 0 },
  },
  scale: {
    hidden: { opacity: 0, scale: 0.8 },
    visible: { opacity: 1, scale: 1 },
  },
  blur: {
    hidden: { opacity: 0, filter: "blur(10px)" },
    visible: { opacity: 1, filter: "blur(0px)" },
  },
}

export function StaggerContainer({
  children,
  className,
  staggerDelay = 0.1,
  initialDelay = 0,
  duration = 0.5,
  once = true,
  animation = "slideUp",
  threshold = 0.1,
}: StaggerContainerProps) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once, amount: threshold })

  const containerVariants: Variants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: staggerDelay,
        delayChildren: initialDelay,
      },
    },
  }

  const itemVariants: Variants = {
    hidden: animations[animation].hidden,
    visible: {
      ...animations[animation].visible,
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
      className={className}
    >
      {Children.map(children, (child) => {
        if (isValidElement(child)) {
          return (
            <motion.div variants={itemVariants}>
              {child}
            </motion.div>
          )
        }
        return child
      })}
    </motion.div>
  )
}

// Grid stagger - for grid layouts
interface GridStaggerProps {
  children: ReactNode
  className?: string
  staggerDelay?: number
  duration?: number
  once?: boolean
  columns?: number
}

export function GridStagger({
  children,
  className,
  staggerDelay = 0.05,
  duration = 0.4,
  once = true,
}: GridStaggerProps) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once, amount: 0.1 })

  const containerVariants: Variants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: staggerDelay,
      },
    },
  }

  const itemVariants: Variants = {
    hidden: { 
      opacity: 0, 
      y: 20,
      scale: 0.95,
    },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
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
      className={className}
    >
      {Children.map(children, (child) => {
        if (isValidElement(child)) {
          return (
            <motion.div variants={itemVariants}>
              {child}
            </motion.div>
          )
        }
        return child
      })}
    </motion.div>
  )
}

// Cascade reveal - items reveal from one direction like a wave
interface CascadeRevealProps {
  children: ReactNode
  className?: string
  direction?: "left" | "right" | "up" | "down"
  staggerDelay?: number
  duration?: number
  once?: boolean
}

export function CascadeReveal({
  children,
  className,
  direction = "up",
  staggerDelay = 0.08,
  duration = 0.6,
  once = true,
}: CascadeRevealProps) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once, amount: 0.2 })

  const getInitialPosition = () => {
    switch (direction) {
      case "left": return { x: 60, y: 0 }
      case "right": return { x: -60, y: 0 }
      case "down": return { x: 0, y: -60 }
      default: return { x: 0, y: 60 }
    }
  }

  const initialPosition = getInitialPosition()

  const containerVariants: Variants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: staggerDelay,
      },
    },
  }

  const itemVariants: Variants = {
    hidden: { 
      opacity: 0,
      ...initialPosition,
    },
    visible: {
      opacity: 1,
      x: 0,
      y: 0,
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
      className={className}
    >
      {Children.map(children, (child) => {
        if (isValidElement(child)) {
          return (
            <motion.div variants={itemVariants}>
              {child}
            </motion.div>
          )
        }
        return child
      })}
    </motion.div>
  )
}

// List reveal with line indicator
interface ListRevealProps {
  children: ReactNode
  className?: string
  lineColor?: string
}

export function ListReveal({
  children,
  className,
  lineColor = "#00E2B5",
}: ListRevealProps) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, amount: 0.2 })

  const containerVariants: Variants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: 0.15,
      },
    },
  }

  const itemVariants: Variants = {
    hidden: { 
      opacity: 0,
      x: -20,
    },
    visible: {
      opacity: 1,
      x: 0,
      transition: {
        duration: 0.5,
        ease: [0.25, 0.4, 0.25, 1],
      },
    },
  }

  const lineVariants: Variants = {
    hidden: { scaleY: 0 },
    visible: {
      scaleY: 1,
      transition: {
        duration: 0.8,
        ease: [0.25, 0.4, 0.25, 1],
      },
    },
  }

  return (
    <div ref={ref} className={cn("relative pl-6", className)}>
      {/* Animated line */}
      <motion.div
        variants={lineVariants}
        initial="hidden"
        animate={isInView ? "visible" : "hidden"}
        className="absolute left-0 top-0 w-0.5 h-full origin-top"
        style={{ backgroundColor: lineColor }}
      />

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate={isInView ? "visible" : "hidden"}
        className="space-y-4"
      >
        {Children.map(children, (child) => {
          if (isValidElement(child)) {
            return (
              <motion.div variants={itemVariants} className="relative">
                {/* Dot indicator */}
                <div 
                  className="absolute -left-6 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full"
                  style={{ backgroundColor: lineColor }}
                />
                {child}
              </motion.div>
            )
          }
          return child
        })}
      </motion.div>
    </div>
  )
}

// Counter animation
interface AnimatedCounterProps {
  value: number
  className?: string
  duration?: number
  prefix?: string
  suffix?: string
}

export function AnimatedCounter({
  value,
  className,
  duration = 2,
  prefix = "",
  suffix = "",
}: AnimatedCounterProps) {
  const ref = useRef<HTMLSpanElement>(null)
  const isInView = useInView(ref, { once: true })

  return (
    <span ref={ref} className={className}>
      {prefix}
      {isInView && (
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            {/* Simple counter using CSS */}
            <span
              style={{
                display: "inline-block",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              <CountUp end={value} duration={duration} />
            </span>
          </motion.span>
        </motion.span>
      )}
      {suffix}
    </span>
  )
}

// Simple count up component
function CountUp({ end, duration }: { end: number; duration: number }) {
  const [count, setCount] = useState(0)
  const ref = useRef<HTMLSpanElement>(null)
  const isInView = useInView(ref, { once: true })

  useEffect(() => {
    if (!isInView) return

    const startTime = Date.now()

    const animate = () => {
      const now = Date.now()
      const progress = Math.min((now - startTime) / (duration * 1000), 1)
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      setCount(Math.round(eased * end))

      if (progress < 1) {
        requestAnimationFrame(animate)
      }
    }

    requestAnimationFrame(animate)
  }, [isInView, end, duration])

  return (
    <motion.span
      ref={ref}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      {count.toLocaleString()}
    </motion.span>
  )
}
