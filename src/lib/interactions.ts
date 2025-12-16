/**
 * Shared Interaction Classes
 * Tailwind CSS classes for consistent interactions without Framer Motion
 * 
 * Usage:
 * import { buttonClasses, cardClasses, inputClasses } from '@/lib/interactions'
 * 
 * <button className={cn(buttonClasses.primary, 'other-classes')}>
 */

// =============================================================================
// BUTTON INTERACTIONS
// =============================================================================

export const buttonClasses = {
  /** Base interactive button (press scale, hover lift, shadow transition) */
  base: [
    'transition-all duration-150 ease-out',
    'active:scale-[0.98] active:shadow-sm',
    'hover:-translate-y-0.5 hover:shadow-md',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
  ].join(' '),

  /** Primary button with enhanced hover */
  primary: [
    'transition-all duration-150 ease-out',
    'active:scale-[0.98]',
    'hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/20',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
  ].join(' '),

  /** Ghost/outline button */
  ghost: [
    'transition-all duration-150 ease-out',
    'active:scale-[0.98] active:bg-muted',
    'hover:bg-muted/50',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
  ].join(' '),

  /** Icon button (circular) */
  icon: [
    'transition-all duration-150 ease-out',
    'active:scale-95',
    'hover:scale-105 hover:bg-muted/50',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
  ].join(' '),

  /** Pill/chip style button */
  chip: [
    'transition-all duration-150 ease-out',
    'active:scale-[0.98]',
    'hover:border-primary/40 hover:shadow-sm',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
  ].join(' '),

  /** Selected state for toggle buttons */
  selected: 'border-primary bg-primary/5 shadow-sm',
  
  /** Unselected state for toggle buttons */
  unselected: 'border-border bg-white hover:border-primary/40 hover:bg-white/80',
}

// =============================================================================
// CARD INTERACTIONS (Desktop-focused with @media hover)
// =============================================================================

export const cardClasses = {
  /** Base card with subtle hover (desktop only) */
  base: [
    'transition-all duration-200 ease-out',
    '@media(hover:hover):hover:-translate-y-0.5',
    '@media(hover:hover):hover:shadow-lg',
    '@media(hover:hover):hover:shadow-black/5',
  ].join(' '),

  /** Interactive card with border highlight */
  interactive: [
    'transition-all duration-200 ease-out cursor-pointer',
    'hover:-translate-y-0.5 hover:border-primary/30',
    'hover:shadow-lg hover:shadow-black/5',
    'active:translate-y-0 active:scale-[0.99]',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
  ].join(' '),

  /** Selected card state */
  selected: 'border-primary bg-primary/5 shadow-sm',

  /** Card with glow on hover */
  glow: [
    'transition-all duration-200 ease-out',
    'hover:shadow-[0_0_20px_rgba(101,163,185,0.15)]',
    'hover:border-primary/20',
  ].join(' '),
}

// =============================================================================
// INPUT INTERACTIONS
// =============================================================================

export const inputClasses = {
  /** Base input with focus ring */
  base: [
    'transition-all duration-150 ease-out',
    'border border-input bg-background',
    'focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary',
    'placeholder:text-muted-foreground',
  ].join(' '),

  /** Input with error state */
  error: [
    'border-destructive',
    'focus:ring-destructive/20 focus:border-destructive',
  ].join(' '),

  /** Input with success state */
  success: [
    'border-emerald-500',
    'focus:ring-emerald-500/20 focus:border-emerald-500',
  ].join(' '),
}

// =============================================================================
// FORM VALIDATION CLASSES
// =============================================================================

export const validationClasses = {
  /** Error message container */
  errorMessage: [
    'text-sm text-destructive',
    'flex items-center gap-1.5',
    'animate-in fade-in-0 slide-in-from-top-1 duration-150',
  ].join(' '),

  /** Success message container */
  successMessage: [
    'text-sm text-emerald-600',
    'flex items-center gap-1.5',
    'animate-in fade-in-0 slide-in-from-top-1 duration-150',
  ].join(' '),

  /** Hint/helper text */
  hint: 'text-xs text-muted-foreground mt-1.5',

  /** Required field indicator */
  required: 'text-destructive ml-0.5',
}

// =============================================================================
// LOADING STATES
// =============================================================================

export const loadingClasses = {
  /** Spinner animation */
  spinner: 'animate-spin',

  /** Pulse animation for loading */
  pulse: 'animate-pulse',

  /** Skeleton base */
  skeleton: [
    'animate-pulse bg-muted rounded-lg',
    'relative overflow-hidden',
    'after:absolute after:inset-0',
    'after:bg-gradient-to-r after:from-transparent after:via-white/10 after:to-transparent',
    'after:animate-shimmer',
  ].join(' '),

  /** Disabled/loading state overlay */
  overlay: [
    'absolute inset-0 bg-background/50 backdrop-blur-[1px]',
    'flex items-center justify-center',
    'animate-in fade-in duration-150',
  ].join(' '),
}

// =============================================================================
// TRANSITION CLASSES
// =============================================================================

export const transitionClasses = {
  /** Fast transition for interactions */
  fast: 'transition-all duration-150 ease-out',

  /** Normal transition */
  normal: 'transition-all duration-200 ease-out',

  /** Slow transition for emphasis */
  slow: 'transition-all duration-300 ease-out',

  /** Color-only transition */
  colors: 'transition-colors duration-150 ease-out',

  /** Transform-only transition */
  transform: 'transition-transform duration-150 ease-out',

  /** Shadow-only transition */
  shadow: 'transition-shadow duration-200 ease-out',
}

// =============================================================================
// FOCUS STATES
// =============================================================================

export const focusClasses = {
  /** Standard focus ring */
  ring: 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',

  /** Inset focus ring (for cards/containers) */
  ringInset: 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset',

  /** No outline but visible focus */
  visible: 'focus-visible:outline-none focus-visible:border-primary focus-visible:shadow-[0_0_0_3px_rgba(101,163,185,0.15)]',
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Get validation state classes for an input
 */
export function getInputStateClasses(
  hasError: boolean,
  isValid: boolean
): string {
  if (hasError) return inputClasses.error
  if (isValid) return inputClasses.success
  return ''
}

/**
 * Get button state classes based on selection
 */
export function getButtonStateClasses(
  isSelected: boolean,
  isDisabled: boolean = false
): string {
  if (isDisabled) return 'opacity-50 cursor-not-allowed'
  return isSelected ? buttonClasses.selected : buttonClasses.unselected
}
