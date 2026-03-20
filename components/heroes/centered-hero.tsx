"use client";

import { motion, useReducedMotion } from "framer-motion";
import { type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { WordReveal } from "@/components/ui/morning/word-reveal";

interface CenteredHeroProps {
  pill?: string;
  title: string;
  highlightWords?: string[];
  subtitle?: string;
  children?: ReactNode;
  className?: string;
}

export function CenteredHero({
  pill,
  title,
  highlightWords,
  subtitle,
  children,
  className,
}: CenteredHeroProps) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <section className={cn("relative py-20 px-4 lg:py-28", className)}>
      <div className="mx-auto max-w-3xl text-center">
        {pill && (
          <motion.span
            className="inline-block rounded-full bg-muted/50 dark:bg-white/[0.06] border border-border/50 px-4 py-1.5 text-xs font-medium tracking-wider text-foreground/60 dark:text-foreground/50 uppercase mb-6"
            initial={prefersReducedMotion ? {} : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {pill}
          </motion.span>
        )}
        <WordReveal
          text={title}
          as="h1"
          highlightWords={highlightWords}
          className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl justify-center"
        />
        {subtitle && (
          <motion.p
            className="mt-6 text-lg text-muted-foreground max-w-xl mx-auto"
            initial={prefersReducedMotion ? {} : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.6 }}
          >
            {subtitle}
          </motion.p>
        )}
        {children && (
          <motion.div
            className="mt-8"
            initial={prefersReducedMotion ? {} : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.8 }}
          >
            {children}
          </motion.div>
        )}
      </div>
    </section>
  );
}
