"use client";

import { motion, useInView, useReducedMotion } from "framer-motion";
import { useRef } from "react";
import { cn } from "@/lib/utils";
import { SectionHeader } from "./section-header";
import type { SectionProps, TimelineStep } from "./types";
import { scrollRevealConfig } from "@/components/ui/motion";

interface TimelineProps extends SectionProps {
  pill?: string;
  title: string;
  subtitle?: string;
  highlightWords?: string[];
  steps: TimelineStep[];
}

function TimelineItem({ step, index }: { step: TimelineStep; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, {
    once: scrollRevealConfig.once,
    amount: 0.3,
  });
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      ref={ref}
      className="relative flex gap-6 pb-12 last:pb-0"
      initial={prefersReducedMotion ? {} : { opacity: 0, x: -20 }}
      animate={
        prefersReducedMotion
          ? {}
          : isInView
            ? { opacity: 1, x: 0 }
            : undefined
      }
      transition={{
        duration: 0.4,
        delay: 0.1,
        ease: [0.25, 0.1, 0.25, 1],
      }}
    >
      {/* Line + dot */}
      <div className="relative flex flex-col items-center">
        <motion.div
          className="z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-primary bg-white dark:bg-background text-primary font-semibold text-sm"
          initial={prefersReducedMotion ? {} : { scale: 0 }}
          animate={
            prefersReducedMotion
              ? {}
              : isInView
                ? { scale: 1 }
                : undefined
          }
          transition={{
            type: "spring",
            stiffness: 300,
            damping: 20,
            delay: 0.15,
          }}
        >
          {step.icon ?? index + 1}
        </motion.div>
        {/* Connecting line */}
        <motion.div
          className="w-0.5 flex-1 bg-border"
          initial={prefersReducedMotion ? {} : { scaleY: 0 }}
          animate={
            prefersReducedMotion
              ? {}
              : isInView
                ? { scaleY: 1 }
                : undefined
          }
          style={{ transformOrigin: "top" }}
          transition={{
            duration: 0.4,
            delay: 0.3,
            ease: "easeOut",
          }}
        />
      </div>

      {/* Content */}
      <div className="pt-1.5 pb-4">
        <h3 className="text-lg font-semibold text-foreground">{step.title}</h3>
        <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
          {step.description}
        </p>
      </div>
    </motion.div>
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
    <section id={id} className={cn("py-20 px-4", className)}>
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
