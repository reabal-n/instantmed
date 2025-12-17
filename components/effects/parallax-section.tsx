"use client"

import { useRef } from "react"
import { motion, useScroll, useTransform } from "framer-motion"
import { cn } from "@/lib/utils"

interface ParallaxSectionProps {
  children: React.ReactNode
  className?: string
  speed?: number // 0 = no parallax, positive = slower, negative = faster
  id?: string
}

export function ParallaxSection({
  children,
  className,
  speed = 0.1,
  id,
}: ParallaxSectionProps) {
  const ref = useRef<HTMLDivElement>(null)
  
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  })

  const y = useTransform(scrollYProgress, [0, 1], [speed * 100, speed * -100])

  return (
    <motion.div
      ref={ref}
      id={id}
      style={{ y }}
      className={cn("relative", className)}
    >
      {children}
    </motion.div>
  )
}
