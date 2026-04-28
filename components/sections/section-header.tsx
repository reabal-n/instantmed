"use client";

import { WordReveal } from "@/components/ui/morning/word-reveal";
import { SectionPill } from "@/components/ui/section-pill";
import { cn } from "@/lib/utils";

interface SectionHeaderProps {
  pill?: string;
  title: string;
  subtitle?: string;
  highlightWords?: string[];
  align?: "left" | "center";
  className?: string;
  titleAs?: "h1" | "h2" | "h3";
}

/**
 * Section header used by FeatureGrid, ProcessSteps, FAQSection, and other
 * shared section primitives. Pairs a SectionPill eyebrow with a
 * WordReveal-animated title.
 *
 * Title typography mirrors the canonical <Heading level="h1"> spec
 * (text-3xl sm:text-4xl font-semibold tracking-[-0.025em] leading-[1.15])
 * for visual impact on top-of-section moments. We can't consume <Heading>
 * directly because WordReveal renders animated word spans rather than
 * plain text, but the className tokens are kept in lockstep with the
 * primitive so any spec change propagates through both surfaces.
 */
export function SectionHeader({
  pill,
  title,
  subtitle,
  highlightWords,
  align = "center",
  className,
  titleAs = "h2",
}: SectionHeaderProps) {
  return (
    <div
      className={cn(
        "mb-12 max-w-3xl",
        align === "center" ? "mx-auto text-center" : "text-left",
        className
      )}
    >
      {pill && (
        <div className="mb-4">
          <SectionPill>{pill}</SectionPill>
        </div>
      )}

      <WordReveal
        text={title}
        as={titleAs}
        highlightWords={highlightWords}
        className={cn(
          "text-3xl sm:text-4xl font-semibold tracking-[-0.025em] leading-[1.15] text-foreground text-balance",
          align === "center" && "justify-center"
        )}
      />

      {subtitle && (
        <p className="mt-4 text-lg text-muted-foreground leading-relaxed">
          {subtitle}
        </p>
      )}
    </div>
  );
}
