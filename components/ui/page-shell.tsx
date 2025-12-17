'use client'

import * as React from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { GradientBg } from './gradient-bg'
import { fadeUp, stagger } from '@/lib/motion'

// =============================================================================
// PAGE SHELL - Main wrapper for onboarding/questionnaire pages
// =============================================================================

interface PageShellProps {
  children: React.ReactNode
  /** Show gradient background */
  gradient?: boolean
  /** Max width constraint */
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  /** Vertical padding */
  padding?: 'sm' | 'md' | 'lg'
  /** Center content vertically */
  centerVertically?: boolean
  className?: string
}

const maxWidthMap = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
  full: 'max-w-full',
}

const paddingMap = {
  sm: 'py-6 px-4',
  md: 'py-8 px-4 md:py-12',
  lg: 'py-12 px-4 md:py-16',
}

export function PageShell({
  children,
  gradient = true,
  maxWidth = 'md',
  padding = 'md',
  centerVertically = false,
  className,
}: PageShellProps) {
  return (
    <div
      className={cn(
        'relative min-h-screen w-full',
        centerVertically && 'flex flex-col justify-center',
        className
      )}
    >
      {/* Background gradient */}
      {gradient && (
        <GradientBg variant="ambient" intensity="subtle" className="fixed inset-0 -z-10" />
      )}
      
      {/* Content container */}
      <div className={cn('mx-auto w-full', maxWidthMap[maxWidth], paddingMap[padding])}>
        {children}
      </div>
    </div>
  )
}

// =============================================================================
// PAGE HEADER - Title and description for pages
// =============================================================================

interface PageHeaderProps {
  /** Page icon */
  icon?: React.ReactNode
  /** Page title */
  title: string
  /** Optional description */
  description?: string
  /** Animate on mount */
  animate?: boolean
  className?: string
}

export function PageHeader({
  icon,
  title,
  description,
  animate = true,
  className,
}: PageHeaderProps) {
  const Wrapper = animate ? motion.div : 'div'
  const wrapperProps = animate ? { variants: fadeUp, initial: 'initial', animate: 'animate' } : {}

  return (
    <Wrapper className={cn('mb-8', className)} {...wrapperProps}>
      {icon && (
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-primary/10 mb-4">
          {icon}
        </div>
      )}
      <h1 className="text-2xl md:text-3xl font-semibold text-foreground tracking-tight">
        {title}
      </h1>
      {description && (
        <p className="mt-2 text-muted-foreground leading-relaxed">
          {description}
        </p>
      )}
    </Wrapper>
  )
}

// =============================================================================
// PAGE CONTENT - Animated content container
// =============================================================================

interface PageContentProps {
  children: React.ReactNode
  /** Animate children with stagger */
  animate?: boolean
  className?: string
}

export function PageContent({
  children,
  animate = true,
  className,
}: PageContentProps) {
  if (!animate) {
    return <div className={className}>{children}</div>
  }

  return (
    <motion.div
      variants={stagger.container}
      initial="initial"
      animate="animate"
      className={className}
    >
      {children}
    </motion.div>
  )
}

// =============================================================================
// PAGE FOOTER - Sticky footer with CTAs
// =============================================================================

interface PageFooterProps {
  children: React.ReactNode
  /** Make footer sticky on mobile */
  sticky?: boolean
  className?: string
}

export function PageFooter({
  children,
  sticky = true,
  className,
}: PageFooterProps) {
  return (
    <div
      className={cn(
        'pt-8',
        sticky && 'sticky bottom-0 pb-4 md:pb-0 md:relative bg-linear-to-t from-background via-background to-transparent',
        className
      )}
    >
      <div className={cn(sticky && 'pt-4 md:pt-0')}>
        {children}
      </div>
    </div>
  )
}
