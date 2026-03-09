"use client"

import { motion, useInView, useReducedMotion, type Variants } from "framer-motion"
import { useRef, type ReactNode } from "react"

interface BlurFadeProps {
  children: ReactNode
  className?: string
  delay?: number
  duration?: number
  yOffset?: number
  inView?: boolean
  blur?: string
}

const variants: Variants = {
  hidden: (custom: { yOffset: number; blur: string }) => ({
    y: custom.yOffset,
    opacity: 0,
    filter: `blur(${custom.blur})`,
  }),
  visible: {
    y: 0,
    opacity: 1,
    filter: "blur(0px)",
  },
}

export function BlurFade({
  children,
  className,
  delay = 0,
  duration = 0.4,
  yOffset = 6,
  inView = true,
  blur = "6px",
}: BlurFadeProps) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: "-50px" })
  const prefersReducedMotion = useReducedMotion()

  return (
    <motion.div
      ref={ref}
      initial={prefersReducedMotion ? false : "hidden"}
      animate={inView ? (isInView ? "visible" : "hidden") : "visible"}
      variants={variants}
      custom={{ yOffset, blur }}
      transition={{
        delay: prefersReducedMotion ? 0 : delay,
        duration: prefersReducedMotion ? 0 : duration,
        ease: [0.21, 0.47, 0.32, 0.98],
      }}
      className={className}
    >
      {children}
    </motion.div>
  )
}
