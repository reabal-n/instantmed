'use client'

import * as React from 'react'
import Link from 'next/link'
import { motion, useReducedMotion } from 'framer-motion'
import { ArrowRight, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { IconBadge } from './icon-badge'
import { spring, duration } from '@/lib/motion'

// =============================================================================
// TYPES
// =============================================================================

export interface ServiceCardProps {
  /** Service title */
  title: string
  /** Short 1-line description */
  description: string
  /** Icon component */
  icon: LucideIcon
  /** Icon badge variant */
  iconVariant?: 'default' | 'gradient' | 'secondary' | 'muted' | 'success' | 'warning' | 'destructive'
  /** Link href */
  href: string
  /** Price display */
  price?: string
  /** Estimated time */
  time?: string
  /** Show popular badge */
  popular?: boolean
  /** Custom className */
  className?: string
}

// =============================================================================
// TOUCH DEVICE DETECTION
// =============================================================================

function useIsTouchDevice() {
  const [isTouch, setIsTouch] = React.useState(false)
  
  React.useEffect(() => {
    // Check for touch capability
    setIsTouch(
      'ontouchstart' in window || 
      navigator.maxTouchPoints > 0 ||
      window.matchMedia('(pointer: coarse)').matches
    )
  }, [])
  
  return isTouch
}

// =============================================================================
// ANIMATED GRADIENT BORDER (desktop non-touch only)
// =============================================================================

function AnimatedGradientBorder({ disabled }: { disabled?: boolean }) {
  if (disabled) return null
  
  return (
    <div 
      className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 pointer-events-none hidden md:block"
      style={{ transition: 'opacity var(--duration-normal) var(--ease-default)' }}
    >
      {/* Animated gradient border - only animates on hover via CSS */}
      <div 
        className="absolute inset-0 rounded-xl gradient-border-animated"
        style={{
          padding: '1px',
          backgroundImage: 'linear-gradient(90deg, oklch(0.65 0.15 185), oklch(0.6 0.12 280), oklch(0.7 0.12 200), oklch(0.65 0.15 185))',
          backgroundSize: '300% 100%',
          WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
          WebkitMaskComposite: 'xor',
          maskComposite: 'exclude',
        }}
      />
    </div>
  )
}

// =============================================================================
// SERVICE CARD COMPONENT
// =============================================================================

export function ServiceCard({
  title,
  description,
  icon: Icon,
  iconVariant = 'default',
  href,
  price,
  time,
  popular,
  className,
}: ServiceCardProps) {
  const shouldReduceMotion = useReducedMotion()
  const reducedMotion = shouldReduceMotion ?? false
  const isTouch = useIsTouchDevice()

  // Disable pointer effects on touch devices
  const enableHoverEffects = !isTouch && !reducedMotion

  return (
    <Link href={href} className="block group">
      <motion.div
        className={cn(
          'relative h-full rounded-xl p-5',
          // Glass background
          'bg-[var(--glass-bg)]',
          'backdrop-blur-[var(--glass-blur)]',
          // Border - consistent 1px
          'border border-[var(--glass-border)]',
          // Shadow - uses CSS variable
          'shadow-[var(--shadow-sm-value)]',
          // Mobile: static premium border highlight
          'before:absolute before:inset-0 before:rounded-xl before:pointer-events-none',
          'before:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]',
          // Transition using CSS variables
          'transition-[transform,box-shadow,border-color]',
          'duration-[var(--duration-normal)]',
          'ease-[var(--ease-default)]',
          // Desktop hover (non-touch only)
          enableHoverEffects && [
            'md:hover:border-primary/30',
            'md:hover:shadow-[var(--shadow-lg-value)]',
          ],
          className
        )}
        // Motion props - only for non-touch, non-reduced-motion
        {...(enableHoverEffects && {
          whileHover: {
            y: -4,
            transition: spring.snappy,
          },
          whileTap: {
            scale: 0.98,
            transition: { duration: duration.instant },
          },
        })}
      >
        {/* Animated gradient border (desktop non-touch only) */}
        <AnimatedGradientBorder disabled={!enableHoverEffects} />

        {/* Popular badge */}
        {popular && (
          <div className="absolute -top-2.5 right-4">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary text-primary-foreground shadow-sm">
              Popular
            </span>
          </div>
        )}

        {/* Card content */}
        <div className="relative z-10 flex flex-col h-full">
          {/* Header: Icon + Title */}
          <div className="flex items-start gap-4 mb-3">
            <IconBadge variant={iconVariant} size="lg" className="shrink-0">
              <Icon className="w-5 h-5" />
            </IconBadge>
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-semibold text-foreground leading-tight mb-1 group-hover:text-primary transition-colors duration-[var(--duration-fast)]">
                {title}
              </h3>
              <p className="text-sm text-muted-foreground leading-snug line-clamp-2">
                {description}
              </p>
            </div>
          </div>

          {/* Footer: Price + Time + Arrow */}
          <div className="mt-auto pt-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {price && (
                <span className="text-sm font-semibold text-foreground">
                  {price}
                </span>
              )}
              {time && (
                <span className="text-xs text-muted-foreground">
                  {time}
                </span>
              )}
            </div>
            
            {/* Arrow indicator */}
            <div className={cn(
              'w-8 h-8 rounded-full bg-surface border border-border flex items-center justify-center',
              'transition-all duration-[var(--duration-fast)]',
              'group-hover:bg-primary group-hover:border-primary group-hover:text-primary-foreground',
              enableHoverEffects && 'md:group-hover:translate-x-1'
            )}>
              <ArrowRight className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* Hover glow overlay (desktop non-touch only) */}
        {enableHoverEffects && (
          <div 
            className="absolute inset-0 rounded-xl pointer-events-none opacity-0 md:group-hover:opacity-100 transition-opacity duration-[var(--duration-normal)]"
            style={{
              background: 'radial-gradient(ellipse at 50% 0%, oklch(0.65 0.15 185 / 0.06) 0%, transparent 70%)',
            }}
          />
        )}
      </motion.div>
    </Link>
  )
}

// =============================================================================
// SERVICE CARD GRID
// =============================================================================

export interface ServiceCardGridProps {
  services: ServiceCardProps[]
  className?: string
}

export function ServiceCardGrid({ services, className }: ServiceCardGridProps) {
  return (
    <motion.div 
      className={cn(
        'grid grid-cols-1 sm:grid-cols-2 gap-4',
        className
      )}
      initial="initial"
      whileInView="animate"
      viewport={{ once: true, margin: '-50px' }}
      variants={{
        initial: {},
        animate: {
          transition: {
            staggerChildren: 0.08,
            delayChildren: 0.1,
          },
        },
      }}
    >
      {services.map((service) => (
        <motion.div
          key={service.title}
          variants={{
            initial: { opacity: 0, y: 16 },
            animate: { 
              opacity: 1, 
              y: 0,
              transition: spring.smooth,
            },
          }}
        >
          <ServiceCard {...service} />
        </motion.div>
      ))}
    </motion.div>
  )
}

// Note: gradient-shift keyframe is defined in globals.css
// Animation only runs on hover via .gradient-border-animated class
