'use client'

import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { motion, type HTMLMotionProps } from 'framer-motion'
import { cn } from '@/lib/utils'

const gradientBgVariants = cva('absolute inset-0 pointer-events-none overflow-hidden', {
  variants: {
    variant: {
      // Radial glow from top center
      hero: [
        '[&>div]:absolute [&>div]:inset-0',
        '[&>div]:bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,var(--gradient-color,oklch(0.65_0.15_185_/_0.12)),transparent_50%)]',
      ],
      // Mesh gradient with multiple points
      mesh: [
        '[&>div]:absolute [&>div]:inset-0',
        '[&>div]:bg-[radial-gradient(at_40%_20%,oklch(0.65_0.15_185_/_0.08)_0px,transparent_50%),radial-gradient(at_80%_0%,oklch(0.6_0.12_280_/_0.06)_0px,transparent_50%),radial-gradient(at_0%_50%,oklch(0.55_0.1_200_/_0.05)_0px,transparent_50%),radial-gradient(at_80%_50%,oklch(0.5_0.08_260_/_0.04)_0px,transparent_50%),radial-gradient(at_0%_100%,oklch(0.6_0.1_185_/_0.06)_0px,transparent_50%)]',
      ],
      // Single centered glow
      center: [
        '[&>div]:absolute [&>div]:inset-0',
        '[&>div]:bg-[radial-gradient(ellipse_at_center,var(--gradient-color,oklch(0.65_0.15_185_/_0.1)),transparent_70%)]',
      ],
      // Top-left accent
      topLeft: [
        '[&>div]:absolute [&>div]:inset-0',
        '[&>div]:bg-[radial-gradient(ellipse_60%_40%_at_10%_10%,var(--gradient-color,oklch(0.65_0.15_185_/_0.1)),transparent_50%)]',
      ],
      // Top-right accent
      topRight: [
        '[&>div]:absolute [&>div]:inset-0',
        '[&>div]:bg-[radial-gradient(ellipse_60%_40%_at_90%_10%,var(--gradient-color,oklch(0.65_0.15_185_/_0.1)),transparent_50%)]',
      ],
      // Bottom glow
      bottom: [
        '[&>div]:absolute [&>div]:inset-0',
        '[&>div]:bg-[radial-gradient(ellipse_80%_50%_at_50%_120%,var(--gradient-color,oklch(0.65_0.15_185_/_0.1)),transparent_50%)]',
      ],
      // Spotlight from top
      spotlight: [
        '[&>div]:absolute [&>div]:inset-0',
        '[&>div]:bg-[radial-gradient(ellipse_40%_80%_at_50%_-10%,var(--gradient-color,oklch(0.7_0.1_185_/_0.15)),transparent_60%)]',
      ],
      // Ambient glow (multiple soft points)
      ambient: [
        '[&>div]:absolute [&>div]:inset-0',
        '[&>div]:bg-[radial-gradient(at_20%_30%,oklch(0.65_0.15_185_/_0.06)_0px,transparent_40%),radial-gradient(at_70%_60%,oklch(0.6_0.1_260_/_0.05)_0px,transparent_40%),radial-gradient(at_40%_80%,oklch(0.55_0.12_200_/_0.04)_0px,transparent_40%)]',
      ],
    },
    intensity: {
      subtle: 'opacity-50',
      default: 'opacity-100',
      strong: 'opacity-150',
    },
    blur: {
      none: '',
      sm: '[&>div]:blur-2xl',
      default: '[&>div]:blur-3xl',
      lg: '[&>div]:blur-[100px]',
    },
  },
  defaultVariants: {
    variant: 'hero',
    intensity: 'default',
    blur: 'default',
  },
})

// =============================================================================
// STATIC GRADIENT BG
// =============================================================================

export interface GradientBgProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof gradientBgVariants> {
  /** Custom gradient color (oklch format recommended) */
  color?: string
}

const GradientBg = React.forwardRef<HTMLDivElement, GradientBgProps>(
  ({ className, variant, intensity, blur, color, style, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(gradientBgVariants({ variant, intensity, blur, className }))}
        style={
          color
            ? ({ '--gradient-color': color, ...style } as React.CSSProperties)
            : style
        }
        aria-hidden="true"
        {...props}
      >
        <div />
      </div>
    )
  }
)
GradientBg.displayName = 'GradientBg'

// =============================================================================
// ANIMATED GRADIENT BG
// =============================================================================

export interface GradientBgMotionProps
  extends Omit<HTMLMotionProps<'div'>, 'onAnimationStart' | 'onDrag' | 'onDragEnd' | 'onDragStart'>,
    VariantProps<typeof gradientBgVariants> {
  color?: string
  /** Animate position (subtle floating effect) */
  animate?: boolean
}

const GradientBgMotion = React.forwardRef<HTMLDivElement, GradientBgMotionProps>(
  (
    { className, variant, intensity, blur, color, style, animate = true, ...props },
    ref
  ) => {
    return (
      <motion.div
        ref={ref}
        className={cn(gradientBgVariants({ variant, intensity, blur, className }))}
        style={
          color
            ? ({ '--gradient-color': color, ...style } as React.CSSProperties)
            : style
        }
        aria-hidden="true"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, ease: 'easeOut' }}
        {...props}
      >
        <motion.div
          animate={
            animate
              ? {
                  scale: [1, 1.05, 1],
                  x: [0, 10, 0],
                  y: [0, -10, 0],
                }
              : undefined
          }
          transition={
            animate
              ? {
                  duration: 20,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }
              : undefined
          }
        />
      </motion.div>
    )
  }
)
GradientBgMotion.displayName = 'GradientBgMotion'

// =============================================================================
// GRADIENT CONTAINER (wraps content with gradient behind)
// =============================================================================

export interface GradientContainerProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof gradientBgVariants> {
  color?: string
}

const GradientContainer = React.forwardRef<HTMLDivElement, GradientContainerProps>(
  ({ className, variant, intensity, blur, color, children, ...props }, ref) => {
    return (
      <div ref={ref} className={cn('relative', className)} {...props}>
        <GradientBg variant={variant} intensity={intensity} blur={blur} color={color} />
        <div className="relative z-10">{children}</div>
      </div>
    )
  }
)
GradientContainer.displayName = 'GradientContainer'

// =============================================================================
// EXPORTS
// =============================================================================

export { GradientBg, GradientBgMotion, GradientContainer, gradientBgVariants }
