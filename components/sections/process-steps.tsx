"use client";

import { motion, useInView, useReducedMotion } from "framer-motion";
import { useRef } from "react";
import { cn } from "@/lib/utils";
import { SectionHeader } from "./section-header";
import type { SectionProps, ProcessStep } from "./types";
import { scrollRevealConfig } from "@/components/ui/motion";

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
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, {
    once: scrollRevealConfig.once,
    amount: scrollRevealConfig.threshold,
  });
  const prefersReducedMotion = useReducedMotion();

  return (
    <section id={id} className={cn("py-20 px-4 bg-gradient-to-br from-sky-50/30 via-transparent to-dawn-50/20 dark:from-muted/20 dark:via-transparent dark:to-accent-teal/[0.04]", className)}>
      <SectionHeader
        pill={pill}
        title={title}
        subtitle={subtitle}
        highlightWords={highlightWords}
      />

      <div ref={ref} className="mx-auto max-w-4xl">
        {/* Desktop: horizontal */}
        <div className="hidden sm:grid sm:grid-cols-3 sm:gap-0 relative">
          {/* Connecting line */}
          <motion.div
            className="absolute top-5 left-[16.67%] right-[16.67%] h-0.5 bg-gradient-to-r from-dawn-200 via-sky-200 to-dawn-200 dark:from-accent-teal/20 dark:via-accent-teal/10 dark:to-accent-teal/20"
            initial={prefersReducedMotion ? {} : { scaleX: 0 }}
            animate={
              prefersReducedMotion
                ? {}
                : isInView
                  ? { scaleX: 1 }
                  : undefined
            }
            style={{ transformOrigin: "left" }}
            transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
          />

          {steps.map((step, i) => (
            <motion.div
              key={step.number}
              className="relative text-center px-4"
              initial={prefersReducedMotion ? {} : { opacity: 0, y: 20 }}
              animate={
                prefersReducedMotion
                  ? {}
                  : isInView
                    ? { opacity: 1, y: 0 }
                    : undefined
              }
              transition={{
                duration: 0.4,
                delay: i * 0.15 + 0.1,
                ease: [0.25, 0.1, 0.25, 1],
              }}
            >
              <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-full border-2 border-dawn-300 bg-dawn-50 dark:border-accent-teal/30 dark:bg-accent-teal/15 text-dawn-700 dark:text-accent-teal font-semibold text-sm z-10 relative">
                {step.number}
              </div>
              <h3 className="text-sm font-semibold text-foreground mb-1">
                {step.title}
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {step.description}
              </p>
            </motion.div>
          ))}
        </div>

        {/* Mobile: vertical stack */}
        <div className="sm:hidden space-y-6">
          {steps.map((step, i) => (
            <motion.div
              key={step.number}
              className="flex gap-4"
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
                delay: i * 0.1,
              }}
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-dawn-300 bg-dawn-50 dark:border-accent-teal/30 dark:bg-accent-teal/15 text-dawn-700 dark:text-accent-teal font-semibold text-xs">
                {step.number}
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">{step.title}</h3>
                <p className="text-xs text-muted-foreground">{step.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
