"use client";

import { motion, useInView, useReducedMotion } from "framer-motion";
import { useRef } from "react";
import { cn } from "@/lib/utils";
import { PerspectiveTiltCard } from "@/components/ui/morning/perspective-tilt-card";
import { SectionHeader } from "./section-header";
import type { SectionProps, FeatureItem } from "./types";
import { scrollRevealConfig } from "@/components/ui/motion";

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
    <section id={id} className={cn("py-20 px-4", className)}>
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
                  : {}
            }
            transition={{
              duration: 0.4,
              delay: i * 0.08,
              ease: [0.25, 0.1, 0.25, 1],
            }}
          >
            <PerspectiveTiltCard variant="glass" className="h-full">
              <div className="mb-4 inline-flex rounded-xl bg-primary/10 p-3 text-primary">
                {feature.icon}
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {feature.title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {feature.description}
              </p>
            </PerspectiveTiltCard>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
