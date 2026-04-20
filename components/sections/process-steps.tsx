"use client";

import { motion } from "framer-motion";
import { useRef } from "react";

import { DottedGrid } from "@/components/marketing/dotted-grid";
import { useReducedMotion,useScrollReveal } from "@/components/ui/motion";
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
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useScrollReveal(ref);
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

      <div ref={ref} className="mx-auto max-w-4xl">
        {/* Desktop: horizontal */}
        <div className="hidden sm:grid sm:grid-cols-3 sm:gap-0 relative">
          {/* Connecting line */}
          <motion.div
            className="absolute top-5 left-[16.67%] right-[16.67%] h-0.5 bg-border"
            initial={prefersReducedMotion ? {} : { scaleX: 0 }}
            animate={
              prefersReducedMotion
                ? {}
                : isInView
                  ? { scaleX: 1 }
                  : undefined
            }
            style={{ transformOrigin: "left" }}
            transition={{ duration: 0.3, delay: 0.1, ease: "easeOut" }}
          />

          {steps.map((step, i) => (
            <motion.div
              key={step.number}
              className="relative text-center px-4"
              initial={prefersReducedMotion ? {} : { y: 20 }}
              animate={
                prefersReducedMotion
                  ? {}
                  : isInView
                    ? { opacity: 1, y: 0 }
                    : undefined
              }
              transition={{
                duration: 0.3,
                delay: i * 0.15 + 0.1,
                ease: [0.25, 0.1, 0.25, 1],
              }}
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
            </motion.div>
          ))}
        </div>

        {/* Mobile: vertical stack */}
        <div className="sm:hidden space-y-6 relative">
          {/* Vertical connecting line */}
          <motion.div
            className="absolute left-4 top-8 bottom-8 w-0.5 -translate-x-1/2 bg-border"
            initial={prefersReducedMotion ? {} : { scaleY: 0 }}
            animate={prefersReducedMotion ? {} : isInView ? { scaleY: 1 } : undefined}
            style={{ transformOrigin: "top" }}
            transition={{ duration: 0.3, delay: 0.1, ease: "easeOut" }}
          />
          {steps.map((step, i) => (
            <motion.div
              key={step.number}
              className="flex gap-4 relative"
              initial={prefersReducedMotion ? {} : { x: -12 }}
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
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-border bg-white dark:bg-card text-foreground font-semibold text-xs shadow-sm">
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
