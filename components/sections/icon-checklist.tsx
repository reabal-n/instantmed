import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

import { SectionHeader } from "./section-header";
import type { ChecklistItem,SectionProps } from "./types";

interface IconChecklistProps extends SectionProps {
  pill?: string;
  title: string;
  subtitle?: string;
  highlightWords?: string[];
  items: ChecklistItem[];
  columns?: 1 | 2;
}

export function IconChecklist({
  pill,
  title,
  subtitle,
  highlightWords,
  items,
  columns = 1,
  className,
  id,
}: IconChecklistProps) {
  return (
    <section id={id} className={cn("py-16 lg:py-24 px-4", className)}>
      <SectionHeader
        pill={pill}
        title={title}
        subtitle={subtitle}
        highlightWords={highlightWords}
      />

      <div
        className={cn(
          "mx-auto max-w-3xl space-y-4",
          columns === 2 && "sm:grid sm:grid-cols-2 sm:gap-4 sm:space-y-0"
        )}
      >
        {items.map((item) => (
          <div
            key={item.text}
            className="flex gap-3 rounded-xl border border-border/50 dark:border-white/15 bg-white dark:bg-card shadow-sm shadow-primary/[0.04] dark:shadow-none p-4 hover:-translate-y-0.5 hover:shadow-md hover:shadow-primary/[0.08] transition-[transform,box-shadow] duration-300"
          >
            <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-success/20 text-success">
              <Check className="h-3 w-3" />
            </div>
            <div>
              <span className="text-sm font-medium text-foreground">{item.text}</span>
              {item.subtext && (
                <p className="mt-0.5 text-xs text-muted-foreground">{item.subtext}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
