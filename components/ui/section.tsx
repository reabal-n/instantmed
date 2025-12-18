'use client'

import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { fadeUp, stagger } from '@/lib/motion'

const sectionVariants = cva('relative w-full', {
  variants: {
    spacing: {
      none: '',
      sm: 'py-8 md:py-12',
      default: 'py-12 md:py-16',
      lg: 'py-16 md:py-24',
      xl: 'py-24 md:py-32',
    },
    container: {
      none: '',
      sm: 'px-4 md:px-6 max-w-2xl mx-auto',
      default: 'px-4 md:px-6 lg:px-8 max-w-6xl mx-auto',
      lg: 'px-4 md:px-6 lg:px-8 max-w-7xl mx-auto',
      full: 'px-4 md:px-6 lg:px-8',
    },
    background: {
      none: '',
      default: 'bg-background',
      surface: 'bg-surface',
      muted: 'bg-muted',
      inset: 'bg-surface-inset',
      gradient: 'gradient-hero',
    },
  },
  defaultVariants: {
    spacing: 'default',
    container: 'default',
    background: 'none',
  },
})

// =============================================================================
// SECTION HEADER
// =============================================================================

export interface SectionHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string
  subtitle?: string
  description?: string
  align?: 'left' | 'center' | 'right'
  as?: 'h1' | 'h2' | 'h3' | 'h4'
}

const SectionHeader = React.forwardRef<HTMLDivElement, SectionHeaderProps>(
  (
    {
      className,
      title,
      subtitle,
      description,
      align = 'center',
      as: Heading = 'h2',
      children,
      ...props
    },
    ref
  ) => {
    const alignClass = {
      left: 'text-left',
      center: 'text-center mx-auto',
      right: 'text-right ml-auto',
    }

    return (
      <div
        ref={ref}
        className={cn('max-w-3xl mb-8 md:mb-12', alignClass[align], className)}
        {...props}
      >
        {subtitle && (
          <p className="text-sm font-medium text-primary mb-2 uppercase tracking-wider">
            {subtitle}
          </p>
        )}
        {title && (
          <Heading className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            {title}
          </Heading>
        )}
        {description && (
          <p className="text-lg text-muted-foreground">{description}</p>
        )}
        {children}
      </div>
    )
  }
)
SectionHeader.displayName = 'SectionHeader'

// =============================================================================
// STATIC SECTION
// =============================================================================

export interface SectionProps
  extends React.HTMLAttributes<HTMLElement>,
    VariantProps<typeof sectionVariants> {
  as?: 'section' | 'div' | 'article' | 'aside'
}

function Section({
  className,
  spacing,
  container,
  background,
  as: Component = 'section',
  ...props
}: SectionProps) {
  return (
    <Component
      className={cn(sectionVariants({ spacing, container, background, className }))}
      {...props}
    />
  )
}

// =============================================================================
// ANIMATED SECTION
// =============================================================================

export interface SectionMotionProps
  extends VariantProps<typeof sectionVariants> {
  animateChildren?: boolean
  className?: string
  children?: React.ReactNode
}

function SectionMotion({
  className,
  spacing,
  container,
  background,
  animateChildren = false,
  children,
}: SectionMotionProps) {
  return (
    <motion.section
      className={cn(sectionVariants({ spacing, container, background, className }))}
      initial="initial"
      whileInView="animate"
      viewport={{ once: true, margin: '-100px' }}
      variants={animateChildren ? stagger.container : fadeUp}
    >
      {animateChildren
        ? React.Children.map(children, (child) =>
            React.isValidElement(child) ? (
              <motion.div variants={stagger.item}>{child}</motion.div>
            ) : (
              child
            )
          )
        : children}
    </motion.section>
  )
}

// =============================================================================
// ANIMATED SECTION HEADER
// =============================================================================

function SectionHeaderMotion({
  className,
  title,
  subtitle,
  description,
  align = 'center',
  as: Heading = 'h2',
  children,
}: SectionHeaderProps) {
  const alignClass = {
    left: 'text-left',
    center: 'text-center mx-auto',
    right: 'text-right ml-auto',
  }

  return (
    <motion.div
      className={cn('max-w-3xl mb-8 md:mb-12', alignClass[align], className)}
      variants={stagger.container}
      initial="initial"
      whileInView="animate"
      viewport={{ once: true, margin: '-50px' }}
    >
      {subtitle && (
        <motion.p
          variants={stagger.item}
          className="text-sm font-medium text-primary mb-2 uppercase tracking-wider"
        >
          {subtitle}
        </motion.p>
      )}
      {title && (
        <motion.div variants={stagger.item}>
          <Heading className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            {title}
          </Heading>
        </motion.div>
      )}
      {description && (
        <motion.p variants={stagger.item} className="text-lg text-muted-foreground">
          {description}
        </motion.p>
      )}
      {children && <motion.div variants={stagger.item}>{children}</motion.div>}
    </motion.div>
  )
}

// =============================================================================
// EXPORTS
// =============================================================================

export {
  Section,
  SectionMotion,
  SectionHeader,
  SectionHeaderMotion,
  sectionVariants,
}
