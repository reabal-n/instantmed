import { DottedGrid } from "@/components/marketing/dotted-grid";
import { cn } from "@/lib/utils";

import { SectionHeader } from "./section-header";
import type { ProcessStep,SectionProps } from "./types";

interface ProcessStepsProps extends SectionProps {
  pill?: string;
  title: string;
  subtitle?: string;
  highlightWords?: string[];
  steps: ProcessStep[];
}

export function ProcessSteps({
  pill,
  title,
  subtitle,
  highlightWords,
  steps,
  className,
  id,
}: ProcessStepsProps) {
  return (
    <section id={id} className={cn("relative py-16 lg:py-24 px-4", className)}>
      <DottedGrid />
      <SectionHeader
        pill={pill}
        title={title}
        subtitle={subtitle}
        highlightWords={highlightWords}
      />

      <div className="mx-auto max-w-4xl">
        {/* Desktop: horizontal */}
        <div className="hidden sm:grid sm:grid-cols-3 sm:gap-0 relative">
          {/* Connecting line */}
          <div className="absolute top-5 left-[16.67%] right-[16.67%] h-0.5 bg-border" />

          {steps.map((step) => (
            <div
              key={step.number}
              className="relative text-center px-4"
            >
              <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-full border-2 border-border bg-white dark:bg-card text-foreground font-semibold text-sm z-10 relative shadow-sm">
                {step.number}
              </div>
              <h3 className="text-sm font-semibold text-foreground mb-1">
                {step.title}
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {step.description}
              </p>
            </div>
          ))}
        </div>

        {/* Mobile: vertical stack */}
        <div className="sm:hidden space-y-6 relative">
          {/* Vertical connecting line */}
          <div className="absolute left-4 top-8 bottom-8 w-0.5 -translate-x-1/2 bg-border" />
          {steps.map((step) => (
            <div
              key={step.number}
              className="flex gap-4 relative"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-border bg-white dark:bg-card text-foreground font-semibold text-xs shadow-sm">
                {step.number}
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">{step.title}</h3>
                <p className="text-xs text-muted-foreground">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
