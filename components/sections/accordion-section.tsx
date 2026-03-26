"use client";

import { cn } from "@/lib/utils";
import { SectionHeader } from "./section-header";
import { FAQList, type FAQGroup } from "@/components/ui/faq-list";
import type { SectionProps } from "./types";

interface AccordionSectionProps extends SectionProps {
  pill?: string;
  title?: string;
  subtitle?: string;
  highlightWords?: string[];
  groups: readonly FAQGroup[];
  /** Hide the section header (useful when a hero already introduces the page) */
  hideHeader?: boolean;
}

export function AccordionSection({
  pill,
  title,
  subtitle,
  highlightWords,
  groups,
  className,
  id,
  hideHeader = false,
}: AccordionSectionProps) {
  return (
    <section id={id} className={cn("py-16 lg:py-24 px-4", className)}>
      {!hideHeader && title && (
        <SectionHeader
          pill={pill}
          title={title}
          subtitle={subtitle}
          highlightWords={highlightWords}
        />
      )}

      <div className="mx-auto max-w-5xl">
        <FAQList groups={groups} />
      </div>
    </section>
  );
}
