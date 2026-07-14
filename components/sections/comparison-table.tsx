import { Check, X } from "lucide-react";

import { cn } from "@/lib/utils";

import { SectionHeader } from "./section-header";
import type { ComparisonItem,SectionProps } from "./types";

interface ComparisonTableProps extends SectionProps {
  pill?: string;
  title: string;
  subtitle?: string;
  highlightWords?: string[];
  usLabel: string;
  themLabel: string;
  items: ComparisonItem[];
}

export function ComparisonTable({
  pill,
  title,
  subtitle,
  highlightWords,
  usLabel,
  themLabel,
  items,
  className,
  id,
}: ComparisonTableProps) {
  return (
    <section id={id} className={cn("py-16 lg:py-24 px-4", className)}>
      <SectionHeader
        pill={pill}
        title={title}
        subtitle={subtitle}
        highlightWords={highlightWords}
      />

      <div className="mx-auto max-w-2xl overflow-hidden rounded-2xl border border-border/50 dark:border-white/15 bg-white dark:bg-card shadow-lg shadow-primary/[0.06] dark:shadow-none">
        {/* Header row */}
        <div className="grid grid-cols-3 sm:grid-cols-[1fr_120px_120px] gap-0 border-b border-border bg-muted/50 px-2 min-[241px]:px-6 py-4 text-xs min-[241px]:text-sm font-medium text-muted-foreground">
          <span />
          <span className="text-center text-primary font-semibold">{usLabel}</span>
          <span className="text-center">{themLabel}</span>
        </div>

        {/* Comparison rows */}
        {items.map((item, i) => (
          <div
            key={item.label}
            className={cn(
              "grid grid-cols-3 sm:grid-cols-[1fr_120px_120px] gap-0 px-2 min-[241px]:px-6 py-4 text-xs min-[241px]:text-sm hover:bg-muted/30 transition-colors duration-200",
              i < items.length - 1 && "border-b border-border/50"
            )}
          >
            <span className="text-foreground">{item.label}</span>
            <span className="flex justify-center">
              {typeof item.us === "boolean" ? (
                item.us ? (
                  <span>
                    <Check className="h-5 w-5 text-success" />
                  </span>
                ) : (
                  <X className="h-5 w-5 text-destructive" />
                )
              ) : (
                <span className="text-foreground font-medium">{item.us}</span>
              )}
            </span>
            <span className="flex justify-center">
              {typeof item.them === "boolean" ? (
                item.them ? (
                  <Check className="h-5 w-5 text-success" />
                ) : (
                  <X className="h-5 w-5 text-destructive" />
                )
              ) : (
                <span className="text-muted-foreground">{item.them}</span>
              )}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
