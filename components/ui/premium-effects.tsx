"use client"

import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

// =============================================================================
// ANIMATED ORBS BACKGROUND - Premium floating orbs effect
// =============================================================================

interface AnimatedOrbsProps {
  className?: string
  orbCount?: number
}

export function AnimatedOrbs({ className, orbCount = 3 }: AnimatedOrbsProps) {
  const orbs = [
    { size: 600, x: "10%", y: "20%", color: "from-primary/20 to-primary/5", delay: 0 },
    { size: 500, x: "70%", y: "60%", color: "from-secondary/15 to-secondary/5", delay: 2 },
    { size: 400, x: "40%", y: "80%", color: "from-violet-500/10 to-violet-500/5", delay: 4 },
  ].slice(0, orbCount)

  return (
    <div className={cn("absolute inset-0 overflow-hidden pointer-events-none", className)}>
      {orbs.map((orb, i) => (
        <motion.div
          key={i}
          className={cn(
            "absolute rounded-full bg-gradient-radial blur-3xl",
            orb.color
          )}
          style={{
            width: orb.size,
            height: orb.size,
            left: orb.x,
            top: orb.y,
            transform: "translate(-50%, -50%)",
          }}
          animate={{
            x: [0, 30, -20, 0],
            y: [0, -20, 30, 0],
            scale: [1, 1.1, 0.95, 1],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            delay: orb.delay,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  )
}

// =============================================================================
// NOISE TEXTURE OVERLAY - Adds subtle grain
// =============================================================================

export function NoiseTexture({ className }: { className?: string }) {
  const noiseSvg = "data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E"
  
  return (
    <div
      className={cn(
        "absolute inset-0 pointer-events-none opacity-[0.015] mix-blend-overlay",
        className
      )}
      style={{
        backgroundImage: `url("${noiseSvg}")`,
      }}
    />
  )
}

// =============================================================================
// GRID PATTERN - Subtle tech grid background
// =============================================================================

interface GridPatternProps {
  className?: string
  size?: number
}

export function GridPattern({ className, size = 40 }: GridPatternProps) {
  return (
    <div
      className={cn("absolute inset-0 pointer-events-none", className)}
      style={{
        backgroundImage: `linear-gradient(to right, rgba(0,0,0,0.02) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,0.02) 1px, transparent 1px)`,
        backgroundSize: `${size}px ${size}px`,
      }}
    />
  )
}

// =============================================================================
// DOT PATTERN - Modern dot grid
// =============================================================================

interface DotPatternProps {
  className?: string
  dotSize?: number
  spacing?: number
}

export function DotPattern({ className, dotSize = 1, spacing = 20 }: DotPatternProps) {
  return (
    <div
      className={cn("absolute inset-0 pointer-events-none opacity-20", className)}
      style={{
        backgroundImage: `radial-gradient(circle, currentColor ${dotSize}px, transparent ${dotSize}px)`,
        backgroundSize: `${spacing}px ${spacing}px`,
      }}
    />
  )
}

// =============================================================================
// GLOW LINE - Animated glowing line separator
// =============================================================================

interface GlowLineProps {
  className?: string
  direction?: "horizontal" | "vertical"
}

export function GlowLine({ className, direction = "horizontal" }: GlowLineProps) {
  const isHorizontal = direction === "horizontal"
  
  return (
    <div className={cn("relative", isHorizontal ? "w-full h-px" : "w-px h-full", className)}>
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
      <motion.div
        className={cn(
          "absolute bg-gradient-to-r from-transparent via-primary to-transparent",
          isHorizontal ? "h-full w-32" : "w-full h-32"
        )}
        animate={{
          [isHorizontal ? "x" : "y"]: ["-100%", "200%"],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "linear",
        }}
      />
    </div>
  )
}

// =============================================================================
// FLOATING BADGE - Animated floating badge with glow
// =============================================================================

interface FloatingBadgeProps {
  children: React.ReactNode
  className?: string
  delay?: number
  color?: string
}

export function FloatingBadge({ 
  children, 
  className, 
  delay = 0,
  color = "primary" 
}: FloatingBadgeProps) {
  return (
    <motion.div
      className={cn(
        "inline-flex items-center gap-2 px-4 py-2 rounded-full",
        "bg-card/80 backdrop-blur-md border border-border/50",
        "shadow-lg",
        className
      )}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5 }}
      whileHover={{ y: -2 }}
    >
      <span className="relative flex h-2 w-2">
        <span 
          className={cn(
            "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
            color === "primary" ? "bg-primary" : 
            color === "success" ? "bg-emerald-500" :
            color === "warning" ? "bg-dawn-500" : "bg-primary"
          )} 
        />
        <span 
          className={cn(
            "relative inline-flex rounded-full h-2 w-2",
            color === "primary" ? "bg-primary" : 
            color === "success" ? "bg-emerald-500" :
            color === "warning" ? "bg-dawn-500" : "bg-primary"
          )} 
        />
      </span>
      {children}
    </motion.div>
  )
}

// =============================================================================
// ANIMATED COUNTER - Number that counts up
// =============================================================================

interface AnimatedCounterProps {
  value: number
  duration?: number
  className?: string
  suffix?: string
  prefix?: string
}

export function AnimatedCounter({ 
  value, 
  duration = 2, 
  className,
  suffix = "",
  prefix = ""
}: AnimatedCounterProps) {
  return (
    <motion.span
      className={className}
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
    >
      <motion.span
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
      >
        {prefix}
      </motion.span>
      <motion.span
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
      >
        {value.toLocaleString()}
      </motion.span>
      <motion.span
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: duration }}
      >
        {suffix}
      </motion.span>
    </motion.span>
  )
}

// =============================================================================
// PREMIUM CARD CONTAINER - Glass card with subtle effects
// =============================================================================

interface PremiumCardProps {
  children: React.ReactNode
  className?: string
  hover?: boolean
  glow?: boolean
  glowColor?: string
}

export function PremiumCard({ 
  children, 
  className, 
  hover = true,
  glow = false,
  glowColor = "primary"
}: PremiumCardProps) {
  return (
    <motion.div
      className={cn(
        "relative rounded-2xl border border-border/50",
        "bg-card/80 backdrop-blur-sm",
        hover && "transition-all duration-300 hover:shadow-xl hover:-translate-y-1",
        glow && "shadow-lg",
        className
      )}
      style={glow ? {
        boxShadow: glowColor === "primary" 
          ? "0 0 60px -12px oklch(0.65 0.15 185 / 0.3)"
          : glowColor === "success"
          ? "0 0 60px -12px oklch(0.7 0.18 155 / 0.3)"
          : "0 0 60px -12px oklch(0.6 0.2 290 / 0.3)"
      } : undefined}
      whileHover={hover ? { scale: 1.01 } : undefined}
    >
      {children}
    </motion.div>
  )
}

// =============================================================================
// SHIMMER BUTTON - Button with animated shimmer effect
// =============================================================================

interface ShimmerButtonProps {
  children: React.ReactNode
  className?: string
  onClick?: () => void
}

export function ShimmerButton({ children, className, onClick }: ShimmerButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "relative overflow-hidden px-6 py-3 rounded-xl font-semibold",
        "bg-gradient-to-r from-primary to-primary/90 text-primary-foreground",
        "hover:shadow-lg hover:shadow-primary/25 transition-shadow",
        className
      )}
    >
      {/* Shimmer effect */}
      <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/20 to-transparent" />
      <span className="relative z-10">{children}</span>
    </button>
  )
}

// =============================================================================
// ICON BADGE - Icon with colored background
// =============================================================================

interface IconBadgeProps {
  icon: React.ReactNode
  variant?: "primary" | "success" | "warning" | "danger" | "info"
  size?: "sm" | "md" | "lg"
  className?: string
}

const iconBadgeVariants = {
  primary: "bg-primary/10 text-primary",
  success: "bg-emerald-500/10 text-emerald-500",
  warning: "bg-dawn-500/10 text-dawn-500",
  danger: "bg-red-500/10 text-red-500",
  info: "bg-violet-500/10 text-violet-500",
}

const iconBadgeSizes = {
  sm: "w-8 h-8",
  md: "w-10 h-10",
  lg: "w-12 h-12",
}

export function IconBadge({ 
  icon, 
  variant = "primary", 
  size = "md",
  className 
}: IconBadgeProps) {
  return (
    <div
      className={cn(
        "rounded-xl flex items-center justify-center",
        iconBadgeVariants[variant],
        iconBadgeSizes[size],
        className
      )}
    >
      {icon}
    </div>
  )
}
