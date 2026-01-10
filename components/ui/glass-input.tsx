"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

/**
 * Soft Pop Glass Input Component
 * 
 * A premium glassmorphism input with focus glow effects.
 * See SOFT_POP_GLASS_DESIGN_SYSTEM.md for full documentation.
 */

const glassInputVariants = cva(
  [
    // Base glass styles
    "w-full rounded-xl transition-all duration-200",
    "bg-white/60 dark:bg-gray-900/40",
    "backdrop-blur-lg",
    "border border-white/30 dark:border-white/10",
    "placeholder:text-muted-foreground/50",
    // Focus states
    "focus:border-primary/50",
    "focus:shadow-[0_0_20px_rgb(59,130,246,0.15)]",
    "focus:outline-none",
    // Error state handled via className
  ],
  {
    variants: {
      inputSize: {
        sm: "h-10 px-3 text-sm",
        default: "h-12 px-4 text-base",
        lg: "h-14 px-5 text-lg",
      },
      hasError: {
        true: "border-destructive/50 focus:border-destructive focus:shadow-[0_0_20px_rgb(239,68,68,0.15)]",
        false: "",
      },
    },
    defaultVariants: {
      inputSize: "default",
      hasError: false,
    },
  }
)

interface GlassInputProps 
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'>,
    VariantProps<typeof glassInputVariants> {
  icon?: React.ReactNode
  endContent?: React.ReactNode
  /** Use the animated glass effect (more complex) */
  animated?: boolean
}

const GlassInput = React.forwardRef<HTMLInputElement, GlassInputProps>(
  ({ className, icon, endContent, inputSize, hasError, animated = false, ...props }, ref) => {
    // Simple glass input (recommended for forms)
    if (!animated) {
      return (
        <div className="relative w-full">
          {icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            className={cn(
              glassInputVariants({ inputSize, hasError }),
              icon && "pl-10",
              endContent && "pr-10",
              className
            )}
            {...props}
          />
          {endContent && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              {endContent}
            </div>
          )}
        </div>
      )
    }

    // Animated glass input (for special cases)
    return (
      <div className="glass-input-wrap w-full">
        <div className="glass-input">
          <span className="glass-input-text-area" />
          {icon && (
            <div className="relative z-10 shrink-0 flex items-center justify-center w-10 pl-2 text-foreground/60">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            className={cn(
              "relative z-10 h-full w-0 flex-grow bg-transparent py-3 text-foreground placeholder:text-foreground/50 focus:outline-none",
              !icon && "pl-4",
              !endContent && "pr-4",
              className
            )}
            {...props}
          />
          {endContent && (
            <div className="relative z-10 shrink-0 flex items-center pr-2">
              {endContent}
            </div>
          )}
        </div>
      </div>
    )
  }
)

GlassInput.displayName = "GlassInput"

// Glass input styles to be added to globals or component
const glassInputStyles = `
  @property --angle-1 { syntax: "<angle>"; inherits: false; initial-value: -75deg; }
  @property --angle-2 { syntax: "<angle>"; inherits: false; initial-value: -45deg; }

  .glass-input-wrap {
    position: relative;
    z-index: 2;
    transform-style: preserve-3d;
    border-radius: 9999px;
  }

  .glass-input {
    display: flex;
    position: relative;
    width: 100%;
    align-items: center;
    gap: 0.5rem;
    border-radius: 9999px;
    padding: 0.25rem;
    -webkit-tap-highlight-color: transparent;
    backdrop-filter: blur(clamp(1px, 0.125em, 4px));
    transition: all 400ms cubic-bezier(0.25, 1, 0.5, 1);
    background: linear-gradient(-75deg, 
      oklch(from var(--background) l c h / 5%), 
      oklch(from var(--background) l c h / 20%), 
      oklch(from var(--background) l c h / 5%)
    );
    box-shadow: 
      inset 0 0.125em 0.125em oklch(from var(--foreground) l c h / 5%),
      inset 0 -0.125em 0.125em oklch(from var(--background) l c h / 50%),
      0 0.25em 0.125em -0.125em oklch(from var(--foreground) l c h / 20%),
      0 0 0.1em 0.25em inset oklch(from var(--background) l c h / 20%);
  }

  .glass-input-wrap:focus-within .glass-input {
    backdrop-filter: blur(0.01em);
    box-shadow: 
      inset 0 0.125em 0.125em oklch(from var(--foreground) l c h / 5%),
      inset 0 -0.125em 0.125em oklch(from var(--background) l c h / 50%),
      0 0.15em 0.05em -0.1em oklch(from var(--foreground) l c h / 25%),
      0 0 0.05em 0.1em inset oklch(from var(--background) l c h / 50%);
  }

  .glass-input::after {
    content: "";
    position: absolute;
    z-index: 1;
    inset: 0;
    border-radius: 9999px;
    width: calc(100% + clamp(1px, 0.0625em, 4px));
    height: calc(100% + clamp(1px, 0.0625em, 4px));
    top: calc(0% - clamp(1px, 0.0625em, 4px) / 2);
    left: calc(0% - clamp(1px, 0.0625em, 4px) / 2);
    padding: clamp(1px, 0.0625em, 4px);
    box-sizing: border-box;
    background: conic-gradient(
      from var(--angle-1) at 50% 50%,
      oklch(from var(--foreground) l c h / 50%) 0%,
      transparent 5% 40%,
      oklch(from var(--foreground) l c h / 50%) 50%,
      transparent 60% 95%,
      oklch(from var(--foreground) l c h / 50%) 100%
    ),
    linear-gradient(180deg, oklch(from var(--background) l c h / 50%), oklch(from var(--background) l c h / 50%));
    mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
    mask-composite: exclude;
    transition: all 400ms cubic-bezier(0.25, 1, 0.5, 1), --angle-1 500ms ease;
    box-shadow: inset 0 0 0 calc(clamp(1px, 0.0625em, 4px) / 2) oklch(from var(--background) l c h / 50%);
    pointer-events: none;
  }

  .glass-input-wrap:focus-within .glass-input::after {
    --angle-1: -125deg;
  }

  .glass-input-text-area {
    position: absolute;
    inset: 0;
    border-radius: 9999px;
    pointer-events: none;
  }

  .glass-input-text-area::after {
    content: "";
    display: block;
    position: absolute;
    width: calc(100% - clamp(1px, 0.0625em, 4px));
    height: calc(100% - clamp(1px, 0.0625em, 4px));
    top: calc(0% + clamp(1px, 0.0625em, 4px) / 2);
    left: calc(0% + clamp(1px, 0.0625em, 4px) / 2);
    box-sizing: border-box;
    border-radius: 9999px;
    overflow: clip;
    background: linear-gradient(var(--angle-2), transparent 0%, oklch(from var(--background) l c h / 50%) 40% 50%, transparent 55%);
    z-index: 3;
    mix-blend-mode: screen;
    pointer-events: none;
    background-size: 200% 200%;
    background-position: 0% 50%;
    transition: background-position calc(400ms * 1.25) cubic-bezier(0.25, 1, 0.5, 1), --angle-2 calc(400ms * 1.25) cubic-bezier(0.25, 1, 0.5, 1);
  }

  .glass-input-wrap:focus-within .glass-input-text-area::after {
    background-position: 25% 50%;
  }
`

export { GlassInput, glassInputStyles }
