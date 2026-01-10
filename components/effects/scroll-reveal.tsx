"use client"

import { useEffect, useRef, useState } from "react"
import { motion, useInView, useAnimation, Variants } from "framer-motion"

interface ScrollRevealProps {
  children: React.ReactNode
  className?: string
  /** Animation variant */
  variant?: "fadeUp" | "fadeDown" | "fadeLeft" | "fadeRight" | "scale" | "blur"
  /** Delay before animation starts (in seconds) */
  delay?: number
  /** Duration of the animation (in seconds) */
  duration?: number
  /** How much of element should be visible before triggering (0-1) */
  threshold?: number
  /** Only animate once */
  once?: boolean
}

const variants: Record<string, Variants> = {
  fadeUp: {
    hidden: { opacity: 0, y: 40 },
    visible: { opacity: 1, y: 0 },
  },
  fadeDown: {
    hidden: { opacity: 0, y: -40 },
    visible: { opacity: 1, y: 0 },
  },
  fadeLeft: {
    hidden: { opacity: 0, x: -40 },
    visible: { opacity: 1, x: 0 },
  },
  fadeRight: {
    hidden: { opacity: 0, x: 40 },
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

/**
 * Scroll Reveal Animation Component
 * Animates elements into view as user scrolls
 */
export function ScrollReveal({
  children,
  className,
  variant = "fadeUp",
  delay = 0,
  duration = 0.6,
  threshold = 0.1,
  once = true,
}: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once, amount: threshold })
  const controls = useAnimation()

  useEffect(() => {
    if (isInView) {
      controls.start("visible")
    } else if (!once) {
      controls.start("hidden")
    }
  }, [isInView, controls, once])

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={controls}
      variants={variants[variant]}
      transition={{
        duration,
        delay,
        ease: [0.25, 0.1, 0.25, 1], // cubic-bezier for smooth easing
      }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

/**
 * Staggered scroll reveal for lists/grids
 */
export function ScrollRevealList({
  children,
  className,
  staggerDelay = 0.1,
  variant = "fadeUp",
}: ScrollRevealProps & { staggerDelay?: number; children: React.ReactNode[] | React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, amount: 0.1 })

  const childArray = Array.isArray(children) ? children : [children]

  return (
    <div ref={ref} className={className}>
      {childArray.map((child, index) => (
        <motion.div
          key={index}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          variants={variants[variant]}
          transition={{
            duration: 0.5,
            delay: index * staggerDelay,
            ease: [0.25, 0.1, 0.25, 1],
          }}
        >
          {child}
        </motion.div>
      ))}
    </div>
  )
}

/**
 * Counter animation that counts up when in view
 */
export function AnimatedCounter({
  value,
  duration = 2,
  className,
  prefix = "",
  suffix = "",
}: {
  value: number
  duration?: number
  className?: string
  prefix?: string
  suffix?: string
}) {
  const [count, setCount] = useState(0)
  const ref = useRef<HTMLSpanElement>(null)
  const isInView = useInView(ref, { once: true })

  useEffect(() => {
    if (!isInView) return

    let startTime: number
    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime
      const progress = Math.min((currentTime - startTime) / (duration * 1000), 1)
      
      // Easing function for smoother animation
      const easeOutQuart = 1 - Math.pow(1 - progress, 4)
      setCount(Math.floor(easeOutQuart * value))

      if (progress < 1) {
        requestAnimationFrame(animate)
      }
    }

    requestAnimationFrame(animate)
  }, [isInView, value, duration])

  return (
    <span ref={ref} className={className}>
      {prefix}{count.toLocaleString()}{suffix}
    </span>
  )
}

export default ScrollReveal
