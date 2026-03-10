"use client";

import { motion, useReducedMotion } from "framer-motion";
import { type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { WordReveal } from "@/components/ui/morning/word-reveal";
import { StatStrip } from "@/components/sections/stat-strip";
import type { StatItem } from "@/components/sections/types";

interface StatsHeroProps {
  pill?: string;
  title: string;
  highlightWords?: string[];
  subtitle?: string;
  stats: StatItem[];
  children?: ReactNode;
  className?: string;
}

export function StatsHero({
  pill,
  title,
  highlightWords,
  subtitle,
  stats,
  children,
  className,
}: StatsHeroProps) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <section className={cn("relative pt-20 lg:pt-28", className)}>
      <div className="mx-auto max-w-3xl text-center px-4">
        {pill && (
          <motion.span
            className="inline-block rounded-full bg-primary/10 px-4 py-1.5 text-xs font-medium tracking-wider text-primary uppercase mb-6"
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
      <div className="mt-12">
        <StatStrip stats={stats} />
      </div>
    </section>
  );
}
