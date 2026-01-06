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

  const glowBackground = useTransform([springX, springY], ([x, y]) =>
    `radial-gradient(${radius}px circle at ${x}px ${y}px, ${glowColor}, transparent 70%)`,
  )

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
          background: glowBackground,
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
          backgroundImage: gradient,
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
          backgroundImage: gradient,
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
// MAGNETIC HOVER EFFECT - Card tilts towards cursor
// =============================================================================

export interface MagneticCardProps {
  children: React.ReactNode
  /** Intensity of the tilt effect (degrees) */
  intensity?: number
  /** Scale on hover */
  scale?: number
  /** Border radius */
  borderRadius?: string
  /** Custom className */
  className?: string
}

export function MagneticCard({
  children,
  intensity = 10,
  scale = 1.02,
  borderRadius = '1rem',
  className,
}: MagneticCardProps) {
  const containerRef = React.useRef<HTMLDivElement>(null)
  const rotateX = useMotionValue(0)
  const rotateY = useMotionValue(0)
  const scaleValue = useMotionValue(1)
  
  const springConfig = { damping: 20, stiffness: 300 }
  const springRotateX = useSpring(rotateX, springConfig)
  const springRotateY = useSpring(rotateY, springConfig)
  const springScale = useSpring(scaleValue, springConfig)

  const handleMouseMove = React.useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = containerRef.current?.getBoundingClientRect()
    if (rect) {
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      const centerX = rect.width / 2
      const centerY = rect.height / 2
      
      rotateX.set(((y - centerY) / centerY) * -intensity)
      rotateY.set(((x - centerX) / centerX) * intensity)
    }
  }, [intensity, rotateX, rotateY])

  const handleMouseEnter = () => {
    scaleValue.set(scale)
  }

  const handleMouseLeave = () => {
    rotateX.set(0)
    rotateY.set(0)
    scaleValue.set(1)
  }

  return (
    <motion.div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        rotateX: springRotateX,
        rotateY: springRotateY,
        scale: springScale,
        borderRadius,
        transformStyle: 'preserve-3d',
        perspective: 1000,
      }}
      className={cn('relative', className)}
    >
      {children}
    </motion.div>
  )
}

// =============================================================================
// GRADIENT BORDER CHASE - Animated gradient that chases around the border
// =============================================================================

export interface GradientBorderChaseProps {
  children: React.ReactNode
  /** Gradient colors */
  colors?: string[]
  /** Animation duration */
  duration?: number
  /** Border width */
  borderWidth?: number
  /** Border radius */
  borderRadius?: string
  /** Custom className */
  className?: string
}

export function GradientBorderChase({
  children,
  colors = ['#2563EB', '#4f46e5', '#4f46e5', '#EC4899', '#2563EB'],
  duration = 4,
  borderWidth = 2,
  borderRadius = '1rem',
  className,
}: GradientBorderChaseProps) {
  return (
    <div className={cn('relative group', className)} style={{ borderRadius }}>
      {/* Rotating gradient border */}
      <motion.div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{
          borderRadius,
          padding: borderWidth,
          background: `conic-gradient(from var(--angle, 0deg), ${colors.join(', ')})`,
          WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
          WebkitMaskComposite: 'xor',
          maskComposite: 'exclude',
        }}
        animate={{
          '--angle': ['0deg', '360deg'],
        } as never}
        transition={{
          duration,
          repeat: Infinity,
          ease: 'linear',
        }}
      />
      
      {/* Glow effect */}
      <motion.div
        className="absolute -inset-1 opacity-0 group-hover:opacity-30 transition-opacity duration-300 blur-lg"
        style={{
          borderRadius,
          background: `conic-gradient(from var(--angle, 0deg), ${colors.join(', ')})`,
        }}
        animate={{
          '--angle': ['0deg', '360deg'],
        } as never}
        transition={{
          duration,
          repeat: Infinity,
          ease: 'linear',
        }}
      />
      
      {/* Content */}
      <div className="relative z-10 bg-background dark:bg-content1" style={{ borderRadius }}>
        {children}
      </div>
    </div>
  )
}

// =============================================================================
// SPOTLIGHT REVEAL - Reveals content with spotlight on hover
// =============================================================================

export interface SpotlightRevealProps {
  children: React.ReactNode
  /** Accent color for the spotlight */
  color?: string
  /** Spotlight size */
  size?: number
  /** Border radius */
  borderRadius?: string
  /** Custom className */
  className?: string
}

export function SpotlightReveal({
  children,
  color = '#2563EB',
  size = 400,
  borderRadius = '1rem',
  className,
}: SpotlightRevealProps) {
  const containerRef = React.useRef<HTMLDivElement>(null)
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)
  const [isHovered, setIsHovered] = React.useState(false)

  const springConfig = { damping: 30, stiffness: 200 }
  const springX = useSpring(mouseX, springConfig)
  const springY = useSpring(mouseY, springConfig)

  const handleMouseMove = React.useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = containerRef.current?.getBoundingClientRect()
    if (rect) {
      mouseX.set(e.clientX - rect.left)
      mouseY.set(e.clientY - rect.top)
    }
  }, [mouseX, mouseY])

  const background = useTransform(
    [springX, springY],
    ([x, y]) => `radial-gradient(${size}px circle at ${x}px ${y}px, ${color}15, transparent 50%)`
  )

  const borderGradient = useTransform(
    [springX, springY],
    ([x, y]) => `radial-gradient(${size * 0.6}px circle at ${x}px ${y}px, ${color}60, transparent 50%)`
  )

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn('relative', className)}
      style={{ borderRadius }}
    >
      {/* Border spotlight */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        style={{
          borderRadius,
          padding: 1,
          background: borderGradient,
          WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
          WebkitMaskComposite: 'xor',
          maskComposite: 'exclude',
          opacity: isHovered ? 1 : 0,
          transition: 'opacity 0.3s',
        }}
      />
      
      {/* Fill spotlight */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        style={{
          borderRadius,
          background,
          opacity: isHovered ? 1 : 0,
          transition: 'opacity 0.3s',
        }}
      />
      
      {/* Content */}
      <div className="relative z-10">{children}</div>
    </div>
  )
}

// =============================================================================
// NEON GLOW - Neon light effect on hover
// =============================================================================

export interface NeonGlowProps {
  children: React.ReactNode
  /** Neon color */
  color?: string
  /** Glow intensity */
  intensity?: 'low' | 'medium' | 'high'
  /** Border radius */
  borderRadius?: string
  /** Custom className */
  className?: string
}

export function NeonGlow({
  children,
  color = '#2563EB',
  intensity = 'medium',
  borderRadius = '1rem',
  className,
}: NeonGlowProps) {
  const intensityMap = {
    low: { blur: 10, spread: 2, opacity: 0.4 },
    medium: { blur: 20, spread: 4, opacity: 0.6 },
    high: { blur: 30, spread: 6, opacity: 0.8 },
  }
  
  const config = intensityMap[intensity]

  return (
    <div className={cn('relative group', className)} style={{ borderRadius }}>
      {/* Neon glow layers */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
        style={{
          borderRadius,
          boxShadow: `
            0 0 ${config.blur}px ${color}${Math.round(config.opacity * 255).toString(16).padStart(2, '0')},
            0 0 ${config.blur * 2}px ${color}${Math.round(config.opacity * 0.5 * 255).toString(16).padStart(2, '0')},
            inset 0 0 ${config.blur / 2}px ${color}${Math.round(config.opacity * 0.3 * 255).toString(16).padStart(2, '0')}
          `,
        }}
      />
      
      {/* Border */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
        style={{
          borderRadius,
          border: `${config.spread / 2}px solid ${color}${Math.round(config.opacity * 0.8 * 255).toString(16).padStart(2, '0')}`,
        }}
      />
      
      {/* Content */}
      <div className="relative z-10">{children}</div>
    </div>
  )
}

// =============================================================================
// HOLOGRAPHIC CARD - Rainbow holographic effect
// =============================================================================

export interface HolographicCardProps {
  children: React.ReactNode
  /** Border radius */
  borderRadius?: string
  /** Intensity of the effect */
  intensity?: number
  /** Custom className */
  className?: string
}

export function HolographicCard({
  children,
  borderRadius = '1rem',
  intensity = 1,
  className,
}: HolographicCardProps) {
  const containerRef = React.useRef<HTMLDivElement>(null)
  const [position, setPosition] = React.useState({ x: 0.5, y: 0.5 })
  const [isHovered, setIsHovered] = React.useState(false)

  const handleMouseMove = React.useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = containerRef.current?.getBoundingClientRect()
    if (rect) {
      setPosition({
        x: (e.clientX - rect.left) / rect.width,
        y: (e.clientY - rect.top) / rect.height,
      })
    }
  }, [])

  const angle = position.x * 20 - 10
  const gradientPosition = `${position.x * 100}% ${position.y * 100}%`

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn('relative group', className)}
      style={{ 
        borderRadius,
        transform: isHovered ? `perspective(1000px) rotateY(${angle * intensity}deg)` : 'none',
        transition: 'transform 0.1s ease-out',
      }}
    >
      {/* Holographic overlay */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none mix-blend-overlay"
        style={{
          borderRadius,
          backgroundImage: `
            linear-gradient(
              ${angle + 45}deg,
              transparent 0%,
              rgba(255, 0, 128, ${0.1 * intensity}) 20%,
              rgba(0, 255, 255, ${0.1 * intensity}) 40%,
              rgba(255, 255, 0, ${0.1 * intensity}) 60%,
              rgba(0, 255, 128, ${0.1 * intensity}) 80%,
              transparent 100%
            )
          `,
          backgroundPosition: gradientPosition,
          backgroundSize: '200% 200%',
        }}
      />
      
      {/* Shine effect */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
        style={{
          borderRadius,
          background: `radial-gradient(circle at ${gradientPosition}, rgba(255,255,255,${0.2 * intensity}), transparent 50%)`,
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
