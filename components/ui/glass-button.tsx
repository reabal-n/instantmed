"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { cva, type VariantProps } from "class-variance-authority"

const glassButtonVariants = cva(
  "relative isolate cursor-pointer rounded-full transition-all",
  {
    variants: {
      size: {
        default: "text-base font-medium",
        sm: "text-sm font-medium",
        lg: "text-lg font-medium",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: { size: "default" },
  }
)

const glassButtonTextVariants = cva(
  "glass-button-text relative block select-none tracking-tight",
  {
    variants: {
      size: {
        default: "px-6 py-3.5",
        sm: "px-4 py-2",
        lg: "px-8 py-4",
        icon: "flex h-10 w-10 items-center justify-center",
      },
    },
    defaultVariants: { size: "default" },
  }
)

export interface GlassButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof glassButtonVariants> {
  contentClassName?: string
}

const GlassButton = React.forwardRef<HTMLButtonElement, GlassButtonProps>(
  ({ className, children, size, contentClassName, onClick, ...props }, ref) => {
    const handleWrapperClick = (e: React.MouseEvent<HTMLDivElement>) => {
      const button = e.currentTarget.querySelector("button")
      if (button && e.target !== button) button.click()
    }

    return (
      <div
        className={cn("glass-button-wrap cursor-pointer rounded-full relative", className)}
        onClick={handleWrapperClick}
      >
        <button
          className={cn("glass-button relative z-10", glassButtonVariants({ size }))}
          ref={ref}
          onClick={onClick}
          {...props}
        >
          <span className={cn(glassButtonTextVariants({ size }), contentClassName)}>
            {children}
          </span>
        </button>
        <div className="glass-button-shadow rounded-full pointer-events-none" />
      </div>
    )
  }
)

GlassButton.displayName = "GlassButton"

const glassButtonStyles = `
  @property --angle-1 { syntax: "<angle>"; inherits: false; initial-value: -75deg; }
  @property --angle-2 { syntax: "<angle>"; inherits: false; initial-value: -45deg; }

  .glass-button-wrap {
    --anim-time: 400ms;
    --anim-ease: cubic-bezier(0.25, 1, 0.5, 1);
    --border-width: clamp(1px, 0.0625em, 4px);
    position: relative;
    z-index: 2;
    transform-style: preserve-3d;
    transition: transform var(--anim-time) var(--anim-ease);
  }

  .glass-button-wrap:has(.glass-button:active) {
    transform: rotateX(25deg);
  }

  .glass-button-shadow {
    --shadow-cutoff-fix: 2em;
    position: absolute;
    width: calc(100% + var(--shadow-cutoff-fix));
    height: calc(100% + var(--shadow-cutoff-fix));
    top: calc(0% - var(--shadow-cutoff-fix) / 2);
    left: calc(0% - var(--shadow-cutoff-fix) / 2);
    filter: blur(clamp(2px, 0.125em, 12px));
    transition: filter var(--anim-time) var(--anim-ease);
    pointer-events: none;
    z-index: 0;
  }

  .glass-button-shadow::after {
    content: "";
    position: absolute;
    inset: 0;
    border-radius: 9999px;
    background: linear-gradient(180deg, oklch(from var(--foreground) l c h / 20%), oklch(from var(--foreground) l c h / 10%));
    width: calc(100% - var(--shadow-cutoff-fix) - 0.25em);
    height: calc(100% - var(--shadow-cutoff-fix) - 0.25em);
    top: calc(var(--shadow-cutoff-fix) - 0.5em);
    left: calc(var(--shadow-cutoff-fix) - 0.875em);
    padding: 0.125em;
    box-sizing: border-box;
    mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
    mask-composite: exclude;
    transition: all var(--anim-time) var(--anim-ease);
    opacity: 1;
  }

  .glass-button {
    -webkit-tap-highlight-color: transparent;
    backdrop-filter: blur(clamp(1px, 0.125em, 4px));
    transition: all var(--anim-time) var(--anim-ease);
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

  .glass-button:hover {
    transform: scale(0.975);
    backdrop-filter: blur(0.01em);
    box-shadow: 
      inset 0 0.125em 0.125em oklch(from var(--foreground) l c h / 5%),
      inset 0 -0.125em 0.125em oklch(from var(--background) l c h / 50%),
      0 0.15em 0.05em -0.1em oklch(from var(--foreground) l c h / 25%),
      0 0 0.05em 0.1em inset oklch(from var(--background) l c h / 50%);
  }

  .glass-button-text {
    color: oklch(from var(--foreground) l c h / 90%);
    text-shadow: 0em 0.25em 0.05em oklch(from var(--foreground) l c h / 10%);
    transition: all var(--anim-time) var(--anim-ease);
  }

  .glass-button:hover .glass-button-text {
    text-shadow: 0.025em 0.025em 0.025em oklch(from var(--foreground) l c h / 12%);
  }

  .glass-button-text::after {
    content: "";
    display: block;
    position: absolute;
    width: calc(100% - var(--border-width));
    height: calc(100% - var(--border-width));
    top: calc(0% + var(--border-width) / 2);
    left: calc(0% + var(--border-width) / 2);
    box-sizing: border-box;
    border-radius: 9999px;
    overflow: clip;
    background: linear-gradient(var(--angle-2), transparent 0%, oklch(from var(--background) l c h / 50%) 40% 50%, transparent 55%);
    z-index: 3;
    mix-blend-mode: screen;
    pointer-events: none;
    background-size: 200% 200%;
    background-position: 0% 50%;
    transition: background-position calc(var(--anim-time) * 1.25) var(--anim-ease), --angle-2 calc(var(--anim-time) * 1.25) var(--anim-ease);
  }

  .glass-button:hover .glass-button-text::after {
    background-position: 25% 50%;
  }

  .glass-button:active .glass-button-text::after {
    background-position: 50% 15%;
    --angle-2: -15deg;
  }

  .glass-button::after {
    content: "";
    position: absolute;
    z-index: 1;
    inset: 0;
    border-radius: 9999px;
    width: calc(100% + var(--border-width));
    height: calc(100% + var(--border-width));
    top: calc(0% - var(--border-width) / 2);
    left: calc(0% - var(--border-width) / 2);
    padding: var(--border-width);
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
    transition: all var(--anim-time) var(--anim-ease), --angle-1 500ms ease;
    box-shadow: inset 0 0 0 calc(var(--border-width) / 2) oklch(from var(--background) l c h / 50%);
    pointer-events: none;
  }

  .glass-button:hover::after {
    --angle-1: -125deg;
  }

  .glass-button:active::after {
    --angle-1: -75deg;
  }

  .glass-button-wrap:has(.glass-button:hover) .glass-button-shadow {
    filter: blur(clamp(2px, 0.0625em, 6px));
  }

  .glass-button-wrap:has(.glass-button:hover) .glass-button-shadow::after {
    top: calc(var(--shadow-cutoff-fix) - 0.875em);
    opacity: 1;
  }

  .glass-button-wrap:has(.glass-button:active) .glass-button-shadow {
    filter: blur(clamp(2px, 0.125em, 12px));
  }

  .glass-button-wrap:has(.glass-button:active) .glass-button-shadow::after {
    top: calc(var(--shadow-cutoff-fix) - 0.5em);
    opacity: 0.75;
  }

  .glass-button-wrap:has(.glass-button:active) .glass-button-text {
    text-shadow: 0.025em 0.25em 0.05em oklch(from var(--foreground) l c h / 12%);
  }

  .glass-button-wrap:has(.glass-button:active) .glass-button {
    box-shadow: 
      inset 0 0.125em 0.125em oklch(from var(--foreground) l c h / 5%),
      inset 0 -0.125em 0.125em oklch(from var(--background) l c h / 50%),
      0 0.125em 0.125em -0.125em oklch(from var(--foreground) l c h / 20%),
      0 0 0.1em 0.25em inset oklch(from var(--background) l c h / 20%),
      0 0.225em 0.05em 0 oklch(from var(--foreground) l c h / 5%),
      0 0.25em 0 0 oklch(from var(--background) l c h / 75%),
      inset 0 0.25em 0.05em 0 oklch(from var(--foreground) l c h / 15%);
  }

  @media (hover: none) and (pointer: coarse) {
    .glass-button::after,
    .glass-button:hover::after,
    .glass-button:active::after {
      --angle-1: -75deg;
    }
    .glass-button .glass-button-text::after,
    .glass-button:active .glass-button-text::after {
      --angle-2: -45deg;
    }
  }
`

export { GlassButton, glassButtonStyles, glassButtonVariants }
