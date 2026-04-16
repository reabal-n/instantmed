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
          "text-3xl font-bold tracking-tight text-foreground sm:text-4xl",
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
