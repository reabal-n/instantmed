'use client'

import * as React from 'react'
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion'
import { cn } from '@/lib/utils'

// =============================================================================
// TYPES
// =============================================================================

export interface GlowingEffectProps {
  /** Content to wrap with glowing effect */
  children: React.ReactNode
  /** Glow color (CSS color value) */
  glowColor?: string
  /** Glow intensity (0-1) */
  intensity?: number
  /** Glow radius in pixels */
  radius?: number
  /** Whether to track mouse movement */
  followMouse?: boolean
  /** Blur amount for the glow */
  blur?: number
  /** Custom className */
  className?: string
  /** Disable the effect */
  disabled?: boolean
}

export interface GlowingBorderProps {
  /** Content to wrap */
  children: React.ReactNode
  /** Border colors (gradient) */
  colors?: string[]
  /** Border width */
  borderWidth?: number
  /** Animation duration in seconds */
  duration?: number
  /** Border radius */
  borderRadius?: string
  /** Custom className */
  className?: string
}

export interface SpotlightProps {
  /** Content to wrap */
  children: React.ReactNode
  /** Spotlight color */
  color?: string
  /** Spotlight size in pixels */
  size?: number
  /** Custom className */
  className?: string
}

export interface PulseGlowProps {
  /** Content to wrap */
  children: React.ReactNode
  /** Glow color */
  color?: string
  /** Pulse animation duration */
  duration?: number
  /** Scale factor for pulse */
  scale?: number
  /** Custom className */
  className?: string
}

// =============================================================================
// MOUSE TRACKING GLOW
// =============================================================================

export function GlowingEffect({
  children,
  glowColor = 'oklch(0.65 0.15 185)',
  intensity = 0.5,
  radius = 200,
  followMouse = true,
  blur = 80,
  className,
  disabled = false,
}: GlowingEffectProps) {
  const containerRef = React.useRef<HTMLDivElement>(null)
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)
  
  const springConfig = { damping: 25, stiffness: 150 }
  const springX = useSpring(mouseX, springConfig)
  const springY = useSpring(mouseY, springConfig)

  const handleMouseMove = React.useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!followMouse || disabled) return
      
      const rect = containerRef.current?.getBoundingClientRect()
      if (rect) {
        mouseX.set(e.clientX - rect.left)
        mouseY.set(e.clientY - rect.top)
      }
    },
    [followMouse, disabled, mouseX, mouseY]
  )

  const handleMouseLeave = React.useCallback(() => {
    if (!followMouse || disabled) return
    
    const rect = containerRef.current?.getBoundingClientRect()
    if (rect) {
      mouseX.set(rect.width / 2)
      mouseY.set(rect.height / 2)
    }
  }, [followMouse, disabled, mouseX, mouseY])

  // Initialize position to center
  React.useEffect(() => {
    const rect = containerRef.current?.getBoundingClientRect()
    if (rect) {
      mouseX.set(rect.width / 2)
      mouseY.set(rect.height / 2)
    }
  }, [mouseX, mouseY])

  if (disabled) {
    return <div className={className}>{children}</div>
  }

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={cn('relative overflow-hidden', className)}
    >
      {/* Glow effect */}
      <motion.div
        className="pointer-events-none absolute inset-0"
        style={{
          background: useTransform(
            [springX, springY],
            ([x, y]) =>
              `radial-gradient(${radius}px circle at ${x}px ${y}px, ${glowColor}, transparent 70%)`
          ),
          opacity: intensity,
          filter: `blur(${blur}px)`,
        }}
      />
      
      {/* Content */}
      <div className="relative z-10">{children}</div>
    </div>
  )
}

// =============================================================================
// ANIMATED GLOWING BORDER
// =============================================================================

export function GlowingBorder({
  children,
  colors = ['oklch(0.65 0.15 185)', 'oklch(0.6 0.15 280)', 'oklch(0.65 0.15 185)'],
  borderWidth = 2,
  duration = 3,
  borderRadius = '1rem',
  className,
}: GlowingBorderProps) {
  const gradient = `linear-gradient(90deg, ${colors.join(', ')})`

  return (
    <div
      className={cn('relative', className)}
      style={{ borderRadius }}
    >
      {/* Animated border */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        style={{
          borderRadius,
          padding: borderWidth,
          background: gradient,
          backgroundSize: '200% 100%',
          WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
          WebkitMaskComposite: 'xor',
          maskComposite: 'exclude',
        }}
        animate={{
          backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
        }}
        transition={{
          duration,
          repeat: Infinity,
          ease: 'linear',
        }}
      />
      
      {/* Outer glow */}
      <motion.div
        className="absolute -inset-px pointer-events-none opacity-50"
        style={{
          borderRadius,
          background: gradient,
          backgroundSize: '200% 100%',
          filter: 'blur(8px)',
        }}
        animate={{
          backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
        }}
        transition={{
          duration,
          repeat: Infinity,
          ease: 'linear',
        }}
      />
      
      {/* Content */}
      <div className="relative z-10 bg-background" style={{ borderRadius }}>
        {children}
      </div>
    </div>
  )
}

// =============================================================================
// SPOTLIGHT EFFECT
// =============================================================================

export function Spotlight({
  children,
  color = 'oklch(0.65 0.15 185 / 0.15)',
  size = 300,
  className,
}: SpotlightProps) {
  const containerRef = React.useRef<HTMLDivElement>(null)
  const [position, setPosition] = React.useState({ x: 0, y: 0 })
  const [isHovered, setIsHovered] = React.useState(false)

  const handleMouseMove = React.useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = containerRef.current?.getBoundingClientRect()
    if (rect) {
      setPosition({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      })
    }
  }, [])

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn('relative overflow-hidden', className)}
    >
      {/* Spotlight */}
      <motion.div
        className="pointer-events-none absolute inset-0"
        animate={{
          opacity: isHovered ? 1 : 0,
        }}
        transition={{ duration: 0.2 }}
        style={{
          background: `radial-gradient(${size}px circle at ${position.x}px ${position.y}px, ${color}, transparent 70%)`,
        }}
      />
      
      {/* Content */}
      <div className="relative z-10">{children}</div>
    </div>
  )
}

// =============================================================================
// PULSE GLOW
// =============================================================================

export function PulseGlow({
  children,
  color = 'oklch(0.65 0.15 185)',
  duration = 2,
  scale = 1.05,
  className,
}: PulseGlowProps) {
  return (
    <div className={cn('relative', className)}>
      {/* Pulsing glow */}
      <motion.div
        className="absolute inset-0 pointer-events-none rounded-inherit"
        style={{
          background: color,
          filter: 'blur(20px)',
          opacity: 0.3,
        }}
        animate={{
          scale: [1, scale, 1],
          opacity: [0.3, 0.5, 0.3],
        }}
        transition={{
          duration,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
      
      {/* Content */}
      <div className="relative z-10">{children}</div>
    </div>
  )
}

// =============================================================================
// SHIMMER EFFECT
// =============================================================================

export interface ShimmerProps {
  /** Content to wrap */
  children: React.ReactNode
  /** Shimmer color */
  color?: string
  /** Animation duration */
  duration?: number
  /** Custom className */
  className?: string
}

export function Shimmer({
  children,
  color = 'rgba(255, 255, 255, 0.1)',
  duration = 2,
  className,
}: ShimmerProps) {
  return (
    <div className={cn('relative overflow-hidden', className)}>
      {/* Shimmer effect */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `linear-gradient(90deg, transparent 0%, ${color} 50%, transparent 100%)`,
          transform: 'skewX(-20deg)',
        }}
        animate={{
          x: ['-200%', '200%'],
        }}
        transition={{
          duration,
          repeat: Infinity,
          ease: 'linear',
          repeatDelay: 1,
        }}
      />
      
      {/* Content */}
      <div className="relative z-10">{children}</div>
    </div>
  )
}

// =============================================================================
// GLOW CARD
// =============================================================================

export interface GlowCardProps {
  children: React.ReactNode
  /** Card glow color */
  glowColor?: string
  /** Whether glow appears on hover only */
  hoverOnly?: boolean
  /** Custom className */
  className?: string
}

export function GlowCard({
  children,
  glowColor = 'oklch(0.65 0.15 185)',
  hoverOnly = true,
  className,
}: GlowCardProps) {
  const [isHovered, setIsHovered] = React.useState(false)

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        'relative rounded-xl bg-card border border-border',
        'transition-all duration-300',
        className
      )}
    >
      {/* Glow effect */}
      <motion.div
        className="absolute -inset-px rounded-xl pointer-events-none"
        style={{
          background: `radial-gradient(600px circle at var(--mouse-x, 50%) var(--mouse-y, 50%), ${glowColor}, transparent 40%)`,
          opacity: hoverOnly ? (isHovered ? 0.15 : 0) : 0.1,
        }}
        animate={{
          opacity: hoverOnly ? (isHovered ? 0.15 : 0) : 0.1,
        }}
        transition={{ duration: 0.3 }}
      />
      
      {/* Border glow */}
      <motion.div
        className="absolute -inset-px rounded-xl pointer-events-none"
        style={{
          background: glowColor,
          opacity: hoverOnly ? (isHovered ? 0.1 : 0) : 0.05,
          filter: 'blur(10px)',
        }}
        animate={{
          opacity: hoverOnly ? (isHovered ? 0.1 : 0) : 0.05,
        }}
        transition={{ duration: 0.3 }}
      />
      
      {/* Content */}
      <div className="relative z-10">{children}</div>
    </div>
  )
}

// =============================================================================
// EXPORTS
// =============================================================================

export default GlowingEffect
