"use client";

import { motion } from "framer-motion"
import { type ReactNode } from "react";

import { WordReveal } from "@/components/ui/morning/word-reveal";
import { useReducedMotion } from "@/components/ui/motion";
import { SectionPill } from "@/components/ui/section-pill";
import { cn } from "@/lib/utils";

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
