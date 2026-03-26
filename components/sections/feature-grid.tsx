"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { cn } from "@/lib/utils";
import { SectionHeader } from "./section-header";
import { DottedGrid } from "@/components/marketing/dotted-grid";
import type { SectionProps, FeatureItem } from "./types";
import { scrollRevealConfig, useReducedMotion } from "@/components/ui/motion";

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
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, {
    once: scrollRevealConfig.once,
    amount: 0.1,
  });
  const prefersReducedMotion = useReducedMotion();

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
        ref={ref}
        className={cn("mx-auto max-w-5xl grid gap-6", colsClass[columns])}
      >
        {features.map((feature, i) => (
          <motion.div
            key={feature.title}
            initial={prefersReducedMotion ? {} : { opacity: 0, y: 20, scale: 0.95 }}
            animate={
              prefersReducedMotion
                ? {}
                : isInView
                  ? { opacity: 1, y: 0, scale: 1 }
                  : undefined
            }
            transition={{
              duration: 0.4,
              delay: i * 0.08,
              ease: [0.25, 0.1, 0.25, 1],
            }}
          >
            <div className="h-full rounded-xl bg-white dark:bg-card border border-border/50 dark:border-white/15 shadow-md shadow-primary/[0.06] dark:shadow-none p-6 hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/[0.1] transition-all duration-300">
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
          </motion.div>
        ))}
      </div>
    </section>
  );
}
