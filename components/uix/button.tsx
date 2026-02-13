"use client"

/**
 * UIX Button - Re-exports the canonical Button from @/components/ui/button
 * 
 * This is the single source of truth for all Button usage across the app.
 * It accepts both shadcn variants (default, destructive, outline, secondary, ghost, link)
 * and HeroUI variants (flat, bordered, solid, light, faded, shadow) plus HeroUI props
 * like color, onPress, isLoading, isDisabled, startContent, endContent, as, radius, etc.
 *
 * Usage:
 *   import { Button } from "@/components/ui/button"      // preferred
 *   import { Button } from "@/components/uix"             // also works
 */
export { Button, buttonVariants, type ButtonProps } from "@/components/ui/button"
