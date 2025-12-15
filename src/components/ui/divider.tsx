'use client'

import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { motion, type HTMLMotionProps } from 'framer-motion'
import { cn } from '@/lib/utils'

const dividerVariants = cva('shrink-0', {
  variants: {
    orientation: {
      horizontal: 'w-full h-px',
      vertical: 'h-full w-px',
    },
    variant: {
      default: 'bg-border',
      subtle: 'bg-border-subtle',
      strong: 'bg-border-strong',
      gradient: '',
      fade: '',
      glow: '',
    },
    spacing: {
      none: '',
      sm: '',
      default: '',
      lg: '',
    },
  },
  compoundVariants: [
    // Horizontal spacing
    { orientation: 'horizontal', spacing: 'sm', className: 'my-2' },
    { orientation: 'horizontal', spacing: 'default', className: 'my-4' },
    { orientation: 'horizontal', spacing: 'lg', className: 'my-8' },
    // Vertical spacing
    { orientation: 'vertical', spacing: 'sm', className: 'mx-2' },
    { orientation: 'vertical', spacing: 'default', className: 'mx-4' },
    { orientation: 'vertical', spacing: 'lg', className: 'mx-8' },
  ],
  defaultVariants: {
    orientation: 'horizontal',
    variant: 'default',
    spacing: 'none',
  },
})

// =============================================================================
// GRADIENT / FADE STYLES
// =============================================================================

function getGradientStyle(
  variant: string | null | undefined,
  orientation: string | null | undefined
): React.CSSProperties | undefined {
  const isHorizontal = orientation !== 'vertical'

  switch (variant) {
    case 'gradient':
      return {
        background: isHorizontal
          ? 'linear-gradient(90deg, transparent, var(--border), transparent)'
          : 'linear-gradient(180deg, transparent, var(--border), transparent)',
      }
    case 'fade':
      return {
        background: isHorizontal
          ? 'linear-gradient(90deg, transparent 0%, var(--border) 15%, var(--border) 85%, transparent 100%)'
          : 'linear-gradient(180deg, transparent 0%, var(--border) 15%, var(--border) 85%, transparent 100%)',
      }
    case 'glow':
      return {
        background: isHorizontal
          ? 'linear-gradient(90deg, transparent, oklch(0.65 0.15 185 / 0.3), transparent)'
          : 'linear-gradient(180deg, transparent, oklch(0.65 0.15 185 / 0.3), transparent)',
        boxShadow: '0 0 8px oklch(0.65 0.15 185 / 0.2)',
      }
    default:
      return undefined
  }
}

// =============================================================================
// STATIC DIVIDER
// =============================================================================

export interface DividerProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof dividerVariants> {
  /** Optional label to show in the middle */
  label?: string
}

const Divider = React.forwardRef<HTMLDivElement, DividerProps>(
  ({ className, orientation, variant, spacing, label, style, ...props }, ref) => {
    const gradientStyle = getGradientStyle(variant, orientation)

    // If there's a label, render a different structure
    if (label && orientation !== 'vertical') {
      return (
        <div
          ref={ref}
          className={cn(
            'flex items-center gap-4 w-full',
            spacing === 'sm' && 'my-2',
            spacing === 'default' && 'my-4',
            spacing === 'lg' && 'my-8',
            className
          )}
          {...props}
        >
          <div
            className={cn(
              'flex-1 h-px',
              variant === 'default' && 'bg-border',
              variant === 'subtle' && 'bg-border-subtle',
              variant === 'strong' && 'bg-border-strong'
            )}
            style={gradientStyle}
          />
          <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
            {label}
          </span>
          <div
            className={cn(
              'flex-1 h-px',
              variant === 'default' && 'bg-border',
              variant === 'subtle' && 'bg-border-subtle',
              variant === 'strong' && 'bg-border-strong'
            )}
            style={gradientStyle}
          />
        </div>
      )
    }

    return (
      <div
        ref={ref}
        role="separator"
        aria-orientation={orientation === 'vertical' ? 'vertical' : 'horizontal'}
        className={cn(dividerVariants({ orientation, variant, spacing, className }))}
        style={{ ...gradientStyle, ...style }}
        {...props}
      />
    )
  }
)
Divider.displayName = 'Divider'

// =============================================================================
// ANIMATED DIVIDER
// =============================================================================

export interface DividerMotionProps
  extends Omit<HTMLMotionProps<'div'>, 'onAnimationStart' | 'onDrag' | 'onDragEnd' | 'onDragStart'>,
    VariantProps<typeof dividerVariants> {
  label?: string
}

const DividerMotion = React.forwardRef<HTMLDivElement, DividerMotionProps>(
  ({ className, orientation, variant, spacing, label, style, ...props }, ref) => {
    const gradientStyle = getGradientStyle(variant, orientation)
    const isHorizontal = orientation !== 'vertical'

    // If there's a label, render a different structure
    if (label && isHorizontal) {
      return (
        <div
          ref={ref}
          className={cn(
            'flex items-center gap-4 w-full',
            spacing === 'sm' && 'my-2',
            spacing === 'default' && 'my-4',
            spacing === 'lg' && 'my-8',
            className
          )}
        >
          <motion.div
            className={cn(
              'flex-1 h-px origin-left',
              variant === 'default' && 'bg-border',
              variant === 'subtle' && 'bg-border-subtle',
              variant === 'strong' && 'bg-border-strong'
            )}
            style={gradientStyle}
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease: [0, 0, 0.2, 1] }}
          />
          <motion.span
            className="text-xs text-muted-foreground font-medium uppercase tracking-wider"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.3, delay: 0.3 }}
          >
            {label}
          </motion.span>
          <motion.div
            className={cn(
              'flex-1 h-px origin-right',
              variant === 'default' && 'bg-border',
              variant === 'subtle' && 'bg-border-subtle',
              variant === 'strong' && 'bg-border-strong'
            )}
            style={gradientStyle}
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease: [0, 0, 0.2, 1] }}
          />
        </div>
      )
    }

    return (
      <motion.div
        ref={ref}
        role="separator"
        aria-orientation={isHorizontal ? 'horizontal' : 'vertical'}
        className={cn(dividerVariants({ orientation, variant, spacing, className }))}
        style={{ ...gradientStyle, ...style }}
        initial={{ 
          scaleX: isHorizontal ? 0 : 1, 
          scaleY: isHorizontal ? 1 : 0,
          opacity: 0.5,
        }}
        whileInView={{ 
          scaleX: 1, 
          scaleY: 1,
          opacity: 1,
        }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, ease: [0, 0, 0.2, 1] }}
        {...props}
      />
    )
  }
)
DividerMotion.displayName = 'DividerMotion'

// =============================================================================
// EXPORTS
// =============================================================================

export { Divider, DividerMotion, dividerVariants }
