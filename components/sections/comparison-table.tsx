"use client";

import { motion, useInView, useReducedMotion } from "framer-motion";
import { useRef } from "react";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { SectionHeader } from "./section-header";
import type { SectionProps, ComparisonItem } from "./types";
import { scrollRevealConfig } from "@/components/ui/motion";

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
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, {
    once: scrollRevealConfig.once,
    amount: scrollRevealConfig.threshold,
  });
  const prefersReducedMotion = useReducedMotion();

  return (
    <section id={id} className={cn("py-20 px-4", className)}>
      <SectionHeader
        pill={pill}
        title={title}
        subtitle={subtitle}
        highlightWords={highlightWords}
      />

      <div ref={ref} className="mx-auto max-w-2xl overflow-hidden rounded-2xl border border-border dark:border-white/10 bg-card/80 dark:bg-white/5 backdrop-blur-sm">
        {/* Header row */}
        <div className="grid grid-cols-[1fr_120px_120px] gap-0 border-b border-border bg-muted/50 px-6 py-4 text-sm font-medium text-muted-foreground">
          <span />
          <span className="text-center text-primary font-semibold">{usLabel}</span>
          <span className="text-center">{themLabel}</span>
        </div>

        {/* Comparison rows */}
        {items.map((item, i) => (
          <motion.div
            key={item.label}
            className={cn(
              "grid grid-cols-[1fr_120px_120px] gap-0 px-6 py-4 text-sm",
              i < items.length - 1 && "border-b border-border/50"
            )}
            initial={prefersReducedMotion ? {} : { opacity: 0, x: -12 }}
            animate={
              prefersReducedMotion
                ? {}
                : isInView
                  ? { opacity: 1, x: 0 }
                  : undefined
            }
            transition={{
              duration: 0.3,
              delay: i * 0.08,
              ease: [0.25, 0.1, 0.25, 1],
            }}
          >
            <span className="text-foreground">{item.label}</span>
            <span className="flex justify-center">
              {typeof item.us === "boolean" ? (
                item.us ? (
                  <Check className="h-5 w-5 text-success" />
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
          </motion.div>
        ))}
      </div>
    </section>
  );
}
