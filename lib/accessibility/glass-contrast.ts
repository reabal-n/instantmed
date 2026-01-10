/**
 * Glass Surface Accessibility Utilities
 * 
 * Ensures glass surfaces meet WCAG 2.1 AA contrast requirements.
 * Minimum contrast ratios:
 * - Normal text: 4.5:1
 * - Large text (18px+ or 14px+ bold): 3:1
 * - UI components and graphical objects: 3:1
 */

/**
 * Glass surface opacity recommendations for accessibility
 * 
 * These values ensure text remains readable on glass surfaces
 * while maintaining the premium glassmorphism aesthetic.
 */
export const GLASS_OPACITY = {
  /** Minimum opacity for text containers - ensures 4.5:1 contrast */
  textContainer: {
    light: 0.7,  // bg-white/70
    dark: 0.6,   // bg-gray-900/60
  },
  /** Opacity for interactive elements - ensures 3:1 contrast */
  interactive: {
    light: 0.85, // bg-white/85 on hover
    dark: 0.8,   // bg-gray-900/80 on hover
  },
  /** Minimum opacity for elevated surfaces (modals, popovers) */
  elevated: {
    light: 0.85,
    dark: 0.8,
  },
} as const

/**
 * Recommended text colors for glass surfaces
 * 
 * Use these semantic color tokens to ensure proper contrast:
 * - text-foreground: Primary text (high contrast)
 * - text-muted-foreground: Secondary text (medium contrast)
 * - text-primary: Accent text (brand color)
 */
export const GLASS_TEXT_COLORS = {
  /** High contrast - for headings and important text */
  primary: 'text-foreground',
  /** Medium contrast - for body text and descriptions */
  secondary: 'text-muted-foreground',
  /** Low contrast - for hints and placeholders (use sparingly) */
  tertiary: 'text-muted-foreground/70',
} as const

/**
 * Glass surface class combinations that meet accessibility standards
 */
export const ACCESSIBLE_GLASS_CLASSES = {
  /** Default glass card - safe for all text */
  card: 'bg-white/70 dark:bg-gray-900/60 backdrop-blur-xl border border-white/40 dark:border-white/10',
  
  /** Elevated glass - for modals and popovers */
  elevated: 'bg-white/85 dark:bg-gray-900/80 backdrop-blur-2xl border border-white/50 dark:border-white/15',
  
  /** Subtle glass - for nested elements (use with caution for text) */
  subtle: 'bg-white/50 dark:bg-gray-900/40 backdrop-blur-lg border border-white/30 dark:border-white/8',
  
  /** Input glass - optimized for form inputs */
  input: 'bg-white/60 dark:bg-gray-900/40 backdrop-blur-lg border border-white/30 dark:border-white/10',
} as const

/**
 * Focus ring styles for accessibility
 * 
 * Ensures focus states are visible for keyboard navigation
 */
export const FOCUS_RING_CLASSES = {
  /** Default focus ring */
  default: 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
  
  /** Focus ring with glow effect */
  glow: 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:shadow-[0_0_20px_rgb(59,130,246,0.3)]',
  
  /** Inset focus ring for inputs */
  inset: 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary',
} as const

/**
 * Accessibility checklist for glass surfaces
 * 
 * Use this when implementing new glass components:
 * 
 * 1. TEXT CONTRAST
 *    - Use text-foreground for primary text on glass
 *    - Avoid text-muted-foreground/50 or lighter on glass
 *    - Test with browser dev tools contrast checker
 * 
 * 2. FOCUS STATES
 *    - All interactive elements must have visible focus rings
 *    - Use FOCUS_RING_CLASSES for consistent styling
 *    - Test with keyboard navigation
 * 
 * 3. COLOR BLINDNESS
 *    - Don't rely solely on color to convey information
 *    - Use icons, patterns, or text labels alongside colors
 *    - Test with color blindness simulators
 * 
 * 4. MOTION
 *    - Respect prefers-reduced-motion media query
 *    - Provide static alternatives for animations
 *    - Avoid animations that could trigger vestibular issues
 * 
 * 5. TOUCH TARGETS
 *    - Minimum touch target size: 44x44px
 *    - Use .touch-target class for interactive elements
 *    - Ensure adequate spacing between targets
 */

/**
 * Helper to check if reduced motion is preferred
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * CSS class for respecting reduced motion preference
 */
export const REDUCED_MOTION_CLASS = 'motion-safe:transition-all motion-reduce:transition-none'
