import { cn } from "@/lib/utils";

import { SectionHeader } from "./section-header";
import type { SectionProps, TimelineStep } from "./types";

interface TimelineProps extends SectionProps {
  pill?: string;
  title: string;
  subtitle?: string;
  highlightWords?: string[];
  steps: TimelineStep[];
}

function TimelineItem({ step, index }: { step: TimelineStep; index: number }) {
  return (
    // items-stretch keeps the connecting line at the right length, and the
    // content column's flex-1 + own internal alignment pushes the heading
    // to the visual centre of the circle. pt-2 matches the optical centre
    // of the 40px circle when paired with the heading's text-lg leading.
    // Tier 1 review 2026-05-25 (brand-spine yhf6): "step-number absolute
    // container off-centre against headlines".
    <div className="relative flex items-stretch gap-6 pb-12 last:pb-0">
      {/* Line + dot */}
      <div className="relative flex flex-col items-center">
        <div className="z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-primary bg-white dark:bg-background text-primary font-semibold text-sm">
          {step.icon ?? index + 1}
        </div>
        {/* Connecting line */}
        <div className="w-0.5 flex-1 bg-border" />
      </div>

      {/* Content - pt sized so the heading's optical centre aligns with
          the 40px circle's centre. */}
      <div className="flex-1 min-w-0 pt-2 pb-4">
        <h3 className="text-lg font-semibold text-foreground leading-tight">{step.title}</h3>
        <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">
          {step.description}
        </p>
      </div>
    </div>
  );
}

export function Timeline({
  pill,
  title,
  subtitle,
  highlightWords,
  steps,
  className,
  id,
}: TimelineProps) {
  return (
    <section id={id} className={cn("py-16 lg:py-24 px-4", className)}>
      <SectionHeader
        pill={pill}
        title={title}
        subtitle={subtitle}
        highlightWords={highlightWords}
      />

      <div className="mx-auto max-w-xl">
        {steps.map((step, i) => (
          <TimelineItem key={step.title} step={step} index={i} />
        ))}
      </div>
    </section>
  );
}
