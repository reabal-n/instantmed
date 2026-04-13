"use client"

import { motion, useMotionValue, useSpring,useTransform } from "framer-motion"
import { useRef } from "react"

import { useReducedMotion } from "@/components/ui/motion"
import { fadeUp } from "@/lib/motion"
import { cn } from "@/lib/utils"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type MockupVariant = "certificate" | "escript" | "chat"

interface InteractiveProductMockupProps {
  variant: MockupVariant
  children: React.ReactNode
  className?: string
}

// ---------------------------------------------------------------------------
// Variant-specific visual treatments
// ---------------------------------------------------------------------------

const VARIANT_STYLES: Record<MockupVariant, string> = {
  // Paper-textured cream background with CSS grain noise
  certificate: cn(
    "bg-[#FAF8F5] dark:bg-card",
    "rounded-2xl border border-border/50 dark:border-white/15",
    "shadow-lg shadow-primary/[0.08] dark:shadow-none",
    "overflow-hidden relative"
  ),
  // Phone frame styling
  escript: cn(
    "bg-white dark:bg-card",
    "rounded-[2rem] border-[3px] border-foreground/10 dark:border-white/20",
    "shadow-xl shadow-primary/[0.1] dark:shadow-none",
    "overflow-hidden relative"
  ),
  // Chat bubble container
  chat: cn(
    "bg-white dark:bg-card",
    "rounded-2xl border border-border/50 dark:border-white/15",
    "shadow-lg shadow-primary/[0.08] dark:shadow-none",
    "overflow-hidden relative"
  ),
}

// ---------------------------------------------------------------------------
// Grain noise overlay (certificate variant only)
// ---------------------------------------------------------------------------

function GrainOverlay() {
  return (
    <div
      className="absolute inset-0 pointer-events-none opacity-[0.03] dark:opacity-[0.015] mix-blend-multiply"
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
      }}
    />
  )
}

// ---------------------------------------------------------------------------
// Phone notch (escript variant only)
// ---------------------------------------------------------------------------

function PhoneNotch() {
  return (
    <div className="flex justify-center pt-2 pb-1">
      <div className="w-24 h-5 rounded-full bg-foreground/10 dark:bg-white/10" />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function InteractiveProductMockup({
  variant,
  children,
  className,
}: InteractiveProductMockupProps) {
  const prefersReducedMotion = useReducedMotion()
  const containerRef = useRef<HTMLDivElement>(null)

  // Mouse tracking for subtle tilt effect
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)

  const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [3, -3]), {
    stiffness: 150,
    damping: 20,
  })
  const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-3, 3]), {
    stiffness: 150,
    damping: 20,
  })

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (prefersReducedMotion) return
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    const x = (e.clientX - rect.left) / rect.width - 0.5
    const y = (e.clientY - rect.top) / rect.height - 0.5
    mouseX.set(x)
    mouseY.set(y)
  }

  function handleMouseLeave() {
    mouseX.set(0)
    mouseY.set(0)
  }

  return (
    <motion.div
      ref={containerRef}
      variants={fadeUp}
      initial={prefersReducedMotion ? {} : "initial"}
      whileInView="animate"
      viewport={{ once: true }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={
        prefersReducedMotion
          ? undefined
          : { rotateX, rotateY, transformPerspective: 800 }
      }
      className={cn(VARIANT_STYLES[variant], className)}
    >
      {variant === "certificate" && <GrainOverlay />}
      {variant === "escript" && <PhoneNotch />}

      <div className="relative z-[1]">{children}</div>
    </motion.div>
  )
}
