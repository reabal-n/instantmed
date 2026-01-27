/**
 * Dark Mode Class Mappings
 * 
 * Use these constants to ensure consistent dark mode styling across the app.
 * Replace hardcoded colors with these semantic classes.
 */

// Background colors
export const BG = {
  // Primary backgrounds
  page: "bg-background",
  card: "bg-card",
  muted: "bg-muted",
  
  // Semantic backgrounds
  success: "bg-emerald-50 dark:bg-emerald-950/30",
  warning: "bg-amber-50 dark:bg-amber-950/30",
  error: "bg-red-50 dark:bg-red-950/30",
  info: "bg-blue-50 dark:bg-blue-950/30",
  
  // Interactive
  hover: "hover:bg-muted",
  active: "bg-primary/10",
} as const

// Text colors
export const TEXT = {
  // Primary text
  primary: "text-foreground",
  secondary: "text-muted-foreground",
  
  // Semantic text
  success: "text-emerald-700 dark:text-emerald-400",
  warning: "text-amber-700 dark:text-amber-400",
  error: "text-red-700 dark:text-red-400",
  info: "text-blue-700 dark:text-blue-400",
  
  // Links
  link: "text-primary hover:text-primary/80",
} as const

// Border colors
export const BORDER = {
  default: "border-border",
  muted: "border-border/50",
  
  // Semantic borders
  success: "border-emerald-200 dark:border-emerald-800",
  warning: "border-amber-200 dark:border-amber-800",
  error: "border-red-200 dark:border-red-800",
  info: "border-blue-200 dark:border-blue-800",
} as const

// Combined semantic styles (bg + text + border)
export const SEMANTIC = {
  success: `${BG.success} ${TEXT.success} ${BORDER.success}`,
  warning: `${BG.warning} ${TEXT.warning} ${BORDER.warning}`,
  error: `${BG.error} ${TEXT.error} ${BORDER.error}`,
  info: `${BG.info} ${TEXT.info} ${BORDER.info}`,
} as const

// Common replacements for hardcoded colors
export const REPLACEMENTS = {
  // Replace bg-white with
  "bg-white": "bg-card",
  
  // Replace bg-gray-50/100 with
  "bg-gray-50": "bg-muted/50",
  "bg-gray-100": "bg-muted",
  
  // Replace text-gray-* with
  "text-gray-500": "text-muted-foreground",
  "text-gray-600": "text-muted-foreground",
  "text-gray-700": "text-foreground",
  "text-gray-800": "text-foreground",
  "text-gray-900": "text-foreground",
  
  // Replace border-gray-* with
  "border-gray-200": "border-border",
  "border-gray-300": "border-border",
} as const

/**
 * Helper to get dark mode aware class
 */
export function darkMode(lightClass: string, darkClass: string): string {
  return `${lightClass} dark:${darkClass}`
}

/**
 * Common patterns that should be replaced
 * 
 * BAD -> GOOD
 * bg-white -> bg-card or bg-background
 * bg-gray-50 -> bg-muted/50
 * bg-gray-100 -> bg-muted
 * text-gray-500 -> text-muted-foreground
 * text-gray-600 -> text-muted-foreground  
 * text-gray-900 -> text-foreground
 * border-gray-200 -> border-border
 * 
 * For colored backgrounds, always add dark mode variant:
 * bg-blue-50 -> bg-blue-50 dark:bg-blue-950/30
 * text-blue-700 -> text-blue-700 dark:text-blue-400
 */
