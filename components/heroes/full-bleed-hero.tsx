"use client";

import { motion, useReducedMotion } from "framer-motion";
import { type ReactNode } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { WordReveal } from "@/components/ui/morning/word-reveal";

interface FullBleedHeroProps {
  pill?: string;
  title: string;
  highlightWords?: string[];
  subtitle?: string;
  imageSrc: string;
  imageAlt: string;
  children?: ReactNode;
  className?: string;
}

export function FullBleedHero({
  pill,
  title,
  highlightWords,
  subtitle,
  imageSrc,
  imageAlt,
  children,
  className,
}: FullBleedHeroProps) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <section className={cn("relative overflow-hidden", className)}>
      {/* Background image */}
      <div className="absolute inset-0">
        <Image
          src={imageSrc}
          alt={imageAlt}
          fill
          sizes="100vw"
          className="object-cover"
          priority
        />
        {/* Gradient scrim */}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-background/40" />
      </div>

      {/* Content */}
      <div className="relative py-28 px-4 lg:py-36">
        <div className="mx-auto max-w-3xl text-center">
          {pill && (
            <motion.span
              className="inline-block rounded-full bg-muted/50 dark:bg-white/[0.06] px-4 py-1.5 text-xs font-medium tracking-wider text-foreground uppercase mb-6 border border-border/50"
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
            className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl justify-center"
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
      </div>
    </section>
  );
}
