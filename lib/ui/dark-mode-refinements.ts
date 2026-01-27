/**
 * Dark Mode Refinements
 * 
 * Enhanced dark mode utilities for consistent theming.
 */

/**
 * Semantic color mappings for dark mode
 * These ensure proper contrast and visibility in dark mode
 */
export const darkModeSemanticColors = {
  // Status colors with proper dark mode contrast
  success: {
    bg: "bg-green-500/10 dark:bg-green-500/20",
    text: "text-green-700 dark:text-green-400",
    border: "border-green-200 dark:border-green-800",
    icon: "text-green-600 dark:text-green-400",
  },
  warning: {
    bg: "bg-amber-500/10 dark:bg-amber-500/20",
    text: "text-amber-700 dark:text-amber-400",
    border: "border-amber-200 dark:border-amber-800",
    icon: "text-amber-600 dark:text-amber-400",
  },
  error: {
    bg: "bg-red-500/10 dark:bg-red-500/20",
    text: "text-red-700 dark:text-red-400",
    border: "border-red-200 dark:border-red-800",
    icon: "text-red-600 dark:text-red-400",
  },
  info: {
    bg: "bg-blue-500/10 dark:bg-blue-500/20",
    text: "text-blue-700 dark:text-blue-400",
    border: "border-blue-200 dark:border-blue-800",
    icon: "text-blue-600 dark:text-blue-400",
  },
  neutral: {
    bg: "bg-gray-500/10 dark:bg-gray-500/20",
    text: "text-gray-700 dark:text-gray-300",
    border: "border-gray-200 dark:border-gray-700",
    icon: "text-gray-600 dark:text-gray-400",
  },
}

/**
 * Interactive element states for dark mode
 */
export const darkModeInteractive = {
  // Buttons
  primaryButton: "bg-primary text-primary-foreground hover:bg-primary/90 dark:hover:bg-primary/80",
  secondaryButton: "bg-secondary text-secondary-foreground hover:bg-secondary/80 dark:bg-secondary/50 dark:hover:bg-secondary/70",
  ghostButton: "hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50",
  destructiveButton: "bg-destructive text-destructive-foreground hover:bg-destructive/90 dark:bg-red-600 dark:hover:bg-red-700",
  
  // Links
  link: "text-primary hover:text-primary/80 dark:text-primary dark:hover:text-primary/90",
  subtleLink: "text-muted-foreground hover:text-foreground dark:hover:text-foreground",
  
  // Form elements
  input: "border-input bg-background dark:bg-background/50 focus:ring-ring dark:focus:ring-ring/50",
  checkbox: "border-primary data-[state=checked]:bg-primary dark:border-primary/70",
}

/**
 * Surface colors for dark mode
 */
export const darkModeSurfaces = {
  // Cards and containers
  card: "bg-card text-card-foreground dark:bg-card/95",
  cardElevated: "bg-card shadow-md dark:bg-card/90 dark:shadow-lg dark:shadow-black/20",
  cardInset: "bg-muted/50 dark:bg-muted/30",
  
  // Modals and overlays
  modal: "bg-background dark:bg-background/95 backdrop-blur-sm",
  overlay: "bg-black/50 dark:bg-black/70",
  
  // Popovers and dropdowns
  popover: "bg-popover text-popover-foreground dark:bg-popover/95 border dark:border-border/50",
  
  // Table rows
  tableRow: "hover:bg-muted/50 dark:hover:bg-muted/30",
  tableRowSelected: "bg-muted dark:bg-muted/50",
  tableHeader: "bg-muted/50 dark:bg-muted/30",
}

/**
 * Text colors with proper dark mode contrast
 */
export const darkModeText = {
  primary: "text-foreground",
  secondary: "text-muted-foreground",
  tertiary: "text-muted-foreground/70 dark:text-muted-foreground/60",
  inverted: "text-background dark:text-foreground",
  
  // Headings
  h1: "text-foreground font-bold",
  h2: "text-foreground font-semibold",
  h3: "text-foreground font-medium",
  
  // Labels
  label: "text-foreground font-medium",
  labelMuted: "text-muted-foreground text-sm",
  
  // Helper text
  helper: "text-muted-foreground text-sm",
  error: "text-destructive dark:text-red-400 text-sm",
}

/**
 * Border colors for dark mode
 */
export const darkModeBorders = {
  default: "border-border dark:border-border/50",
  subtle: "border-border/50 dark:border-border/30",
  strong: "border-border dark:border-border/70",
  focus: "ring-ring dark:ring-ring/70",
  divider: "border-border/30 dark:border-border/20",
}

/**
 * Shadow utilities for dark mode
 */
export const darkModeShadows = {
  sm: "shadow-sm dark:shadow-none dark:ring-1 dark:ring-border/10",
  md: "shadow-md dark:shadow-lg dark:shadow-black/20",
  lg: "shadow-lg dark:shadow-xl dark:shadow-black/30",
  xl: "shadow-xl dark:shadow-2xl dark:shadow-black/40",
  inner: "shadow-inner dark:shadow-inner dark:bg-black/5",
}

/**
 * Glass morphism effects for dark mode
 */
export const darkModeGlass = {
  light: "bg-white/70 dark:bg-black/30 backdrop-blur-sm border border-white/20 dark:border-white/10",
  medium: "bg-white/50 dark:bg-black/50 backdrop-blur-md border border-white/30 dark:border-white/15",
  heavy: "bg-white/30 dark:bg-black/70 backdrop-blur-lg border border-white/40 dark:border-white/20",
}

/**
 * Utility to get status color classes
 */
export function getStatusColors(status: "success" | "warning" | "error" | "info" | "neutral") {
  return darkModeSemanticColors[status]
}

/**
 * Utility to combine dark mode classes
 */
export function dm(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(" ")
}

/**
 * CSS custom properties for dark mode
 * Use these in your tailwind.config.js
 */
export const darkModeCSSVariables = {
  light: {
    "--background": "0 0% 100%",
    "--foreground": "222.2 84% 4.9%",
    "--card": "0 0% 100%",
    "--card-foreground": "222.2 84% 4.9%",
    "--popover": "0 0% 100%",
    "--popover-foreground": "222.2 84% 4.9%",
    "--primary": "221.2 83.2% 53.3%",
    "--primary-foreground": "210 40% 98%",
    "--secondary": "210 40% 96.1%",
    "--secondary-foreground": "222.2 47.4% 11.2%",
    "--muted": "210 40% 96.1%",
    "--muted-foreground": "215.4 16.3% 46.9%",
    "--accent": "210 40% 96.1%",
    "--accent-foreground": "222.2 47.4% 11.2%",
    "--destructive": "0 84.2% 60.2%",
    "--destructive-foreground": "210 40% 98%",
    "--border": "214.3 31.8% 91.4%",
    "--input": "214.3 31.8% 91.4%",
    "--ring": "221.2 83.2% 53.3%",
  },
  dark: {
    "--background": "222.2 84% 4.9%",
    "--foreground": "210 40% 98%",
    "--card": "222.2 84% 4.9%",
    "--card-foreground": "210 40% 98%",
    "--popover": "222.2 84% 4.9%",
    "--popover-foreground": "210 40% 98%",
    "--primary": "217.2 91.2% 59.8%",
    "--primary-foreground": "222.2 47.4% 11.2%",
    "--secondary": "217.2 32.6% 17.5%",
    "--secondary-foreground": "210 40% 98%",
    "--muted": "217.2 32.6% 17.5%",
    "--muted-foreground": "215 20.2% 65.1%",
    "--accent": "217.2 32.6% 17.5%",
    "--accent-foreground": "210 40% 98%",
    "--destructive": "0 62.8% 50.6%",
    "--destructive-foreground": "210 40% 98%",
    "--border": "217.2 32.6% 17.5%",
    "--input": "217.2 32.6% 17.5%",
    "--ring": "224.3 76.3% 48%",
  },
}
