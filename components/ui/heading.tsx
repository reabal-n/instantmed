import { type ElementType, forwardRef, type HTMLAttributes, type ReactNode } from "react"

import { cn } from "@/lib/utils"

/**
 * Canonical typography scale. Pinned against docs/DESIGN_SYSTEM.md §2.
 *
 * - display → hero headlines (48px @ sm+, scales to 60px on lg for premium impact)
 * - h1 → page titles
 * - h2 → section headings
 * - h3 → card / sub-section titles
 *
 * The component picks a sensible default semantic element for each level
 * but accepts `as` so visual hierarchy can be decoupled from semantic
 * order when SEO/IA requires it (e.g. a section title that visually reads
 * as display but semantically is an h2).
 */
export type HeadingLevel = "display" | "h1" | "h2" | "h3"

const levelStyles: Record<HeadingLevel, string> = {
  // 36 → 48 → 60. Matches docs/DESIGN_SYSTEM.md §2 (display = 48px) and steps
  // up to 60px on lg for premium hero impact.
  display:
    "text-4xl sm:text-5xl lg:text-6xl font-light tracking-[-0.03em] leading-[1.05]",
  // 30 → 36. Page titles, also used (via `as="h2"`) for hero-style section
  // headings that need extra weight on the home page.
  h1: "text-3xl sm:text-4xl font-semibold tracking-[-0.025em] leading-[1.15]",
  // 24 → 30. Standard section heading. Spec calls for 24px; we step to 30px
  // on sm+ to match the pre-existing rhythm across marketing sections.
  h2: "text-2xl sm:text-3xl font-semibold tracking-[-0.02em] leading-[1.25]",
  // 18px stable. Card and sub-section titles. Bumps up from 16px patterns
  // that drifted across the codebase pre-Pass 2.
  h3: "text-lg font-semibold tracking-[-0.01em] leading-[1.35]",
}

const defaultElement: Record<HeadingLevel, ElementType> = {
  display: "h1",
  h1: "h1",
  h2: "h2",
  h3: "h3",
}

export interface HeadingProps extends HTMLAttributes<HTMLHeadingElement> {
  level: HeadingLevel
  /** Override the semantic element. Defaults: display→h1, h1→h1, h2→h2, h3→h3. */
  as?: ElementType
  /** Default true. Set false on long, multi-line headings where balancing hurts rhythm. */
  balance?: boolean
  children: ReactNode
}

export const Heading = forwardRef<HTMLHeadingElement, HeadingProps>(
  function Heading({ level, as, balance = true, className, children, ...rest }, ref) {
    const Component = (as ?? defaultElement[level]) as ElementType

    return (
      <Component
        ref={ref}
        className={cn(
          levelStyles[level],
          balance && "text-balance",
          "text-foreground",
          className,
        )}
        {...rest}
      >
        {children}
      </Component>
    )
  },
)
