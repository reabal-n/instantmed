import { type ReactNode } from "react";

import { WordReveal } from "@/components/ui/morning/word-reveal";
import { SectionPill } from "@/components/ui/section-pill";
import { cn } from "@/lib/utils";

interface CenteredHeroProps {
  pill?: string;
  title: string;
  highlightWords?: string[];
  subtitle?: string;
  children?: ReactNode;
  className?: string;
}

/**
 * Centered marketing hero.
 *
 * IMPORTANT for LCP: the subtitle and children MUST render with default opacity
 * (no `initial={{ opacity: 0 }}`). On the conditions landing pages the subtitle
 * is the LCP element; when it was wrapped in a framer-motion fade-in, Lighthouse
 * saw a ~6-8s render delay on Ubuntu CI hardware because the text was invisible
 * until JS hydrated and the delay-timer expired. Plain HTML renders immediately.
 * See docs/audits/... and commit history for the regression context.
 *
 * The title keeps WordReveal because the words are present in the DOM (only
 * transform-animated) and are SSR'd via the reduced-motion code path when set.
 */
export function CenteredHero({
  pill,
  title,
  highlightWords,
  subtitle,
  children,
  className,
}: CenteredHeroProps) {
  return (
    <section className={cn("relative py-20 px-4 lg:py-28", className)}>
      <div className="mx-auto max-w-3xl text-center">
        {pill && (
          <div className="mb-6">
            <SectionPill>{pill}</SectionPill>
          </div>
        )}
        <WordReveal
          text={title}
          as="h1"
          highlightWords={highlightWords}
          className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl justify-center"
        />
        {subtitle && (
          <p className="mt-6 text-lg text-muted-foreground max-w-xl mx-auto">
            {subtitle}
          </p>
        )}
        {children && <div className="mt-8">{children}</div>}
      </div>
    </section>
  );
}
