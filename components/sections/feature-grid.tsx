import { DottedGrid } from "@/components/marketing/dotted-grid";
import { cn } from "@/lib/utils";

import { SectionHeader } from "./section-header";
import type { FeatureItem,SectionProps } from "./types";

interface FeatureGridProps extends SectionProps {
  pill?: string;
  title: string;
  subtitle?: string;
  highlightWords?: string[];
  features: FeatureItem[];
  columns?: 2 | 3 | 4;
}

const colsClass = {
  2: "sm:grid-cols-2",
  3: "sm:grid-cols-2 lg:grid-cols-3",
  4: "sm:grid-cols-2 lg:grid-cols-4",
};

export function FeatureGrid({
  pill,
  title,
  subtitle,
  highlightWords,
  features,
  columns = 3,
  className,
  id,
}: FeatureGridProps) {
  return (
    <section id={id} className={cn("relative py-16 lg:py-24 px-4", className)}>
      <DottedGrid />
      <SectionHeader
        pill={pill}
        title={title}
        subtitle={subtitle}
        highlightWords={highlightWords}
      />

      <div
        className={cn("mx-auto max-w-5xl grid gap-6", colsClass[columns])}
      >
        {features.map((feature) => (
          <div
            key={feature.title}
            className="h-full"
          >
            <div className="h-full rounded-xl bg-white dark:bg-card border border-border/50 dark:border-white/15 shadow-md shadow-primary/[0.06] dark:shadow-none p-6 hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/[0.1] transition-[transform,box-shadow] duration-300">
              <div className="mb-4 inline-flex rounded-xl bg-primary/5 p-3 text-primary">
                {feature.icon}
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {feature.title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {feature.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
