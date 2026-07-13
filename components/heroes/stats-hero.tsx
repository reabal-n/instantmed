"use client";

import { motion, useAnimationControls } from "framer-motion"
import { type ReactNode, useEffect } from "react";

import { StatStrip } from "@/components/sections/stat-strip";
import type { StatItem } from "@/components/sections/types";
import { WordReveal } from "@/components/ui/morning/word-reveal";
import { useReducedMotion } from "@/components/ui/motion";
import { SectionPill } from "@/components/ui/section-pill";
import { cn } from "@/lib/utils";

interface StatsHeroProps {
  pill?: string;
  title: string;
  highlightWords?: string[];
  subtitle?: string;
  stats: StatItem[];
  children?: ReactNode;
  className?: string;
}

const SETTLED_CONTENT_VARIANTS = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0 },
  reduced: { opacity: 1, y: 0, transition: { duration: 0, delay: 0 } },
};

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
  const entranceControls = useAnimationControls();

  useEffect(() => {
    if (prefersReducedMotion) {
      entranceControls.stop();
      void entranceControls.set("reduced");
      return;
    }

    void entranceControls.start("visible");
  }, [entranceControls, prefersReducedMotion]);

  return (
    <section className={cn("relative pt-20 lg:pt-28", className)}>
      <div className="mx-auto max-w-3xl text-center px-4">
        {pill && (
          <div className="mb-6">
            <SectionPill>{pill}</SectionPill>
          </div>
        )}
        <WordReveal
          text={title}
          as="h1"
          highlightWords={highlightWords}
          className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl justify-center"
        />
        {subtitle && (
          <motion.p
            data-reduced-motion-final="stats-subtitle"
            className="mt-6 text-lg text-muted-foreground max-w-xl mx-auto"
            variants={SETTLED_CONTENT_VARIANTS}
            initial={prefersReducedMotion ? "reduced" : "hidden"}
            animate={entranceControls}
            transition={{
              duration: prefersReducedMotion ? 0 : 0.3,
              delay: prefersReducedMotion ? 0 : 0.6,
            }}
          >
            {subtitle}
          </motion.p>
        )}
        {children && (
          <motion.div
            data-reduced-motion-final="stats-content"
            className="mt-8"
            variants={SETTLED_CONTENT_VARIANTS}
            initial={prefersReducedMotion ? "reduced" : "hidden"}
            animate={entranceControls}
            transition={{
              duration: prefersReducedMotion ? 0 : 0.3,
              delay: prefersReducedMotion ? 0 : 0.8,
            }}
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
