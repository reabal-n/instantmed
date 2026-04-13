"use client";

import { motion } from "framer-motion"
import { type ReactNode } from "react";

import { ClipPathImage } from "@/components/ui/morning/clip-path-image";
import { WordReveal } from "@/components/ui/morning/word-reveal";
import { useReducedMotion } from "@/components/ui/motion";
import { SectionPill } from "@/components/ui/section-pill";
import { cn } from "@/lib/utils";

interface SplitHeroProps {
  pill?: string;
  title: string;
  highlightWords?: string[];
  subtitle: string;
  imageSrc: string;
  imageAlt: string;
  children?: ReactNode;
  className?: string;
}

export function SplitHero({
  pill,
  title,
  highlightWords,
  subtitle,
  imageSrc,
  imageAlt,
  children,
  className,
}: SplitHeroProps) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <section className={cn("relative py-20 px-4 lg:py-28", className)}>
      <div className="mx-auto max-w-5xl flex flex-col items-center gap-12 lg:flex-row lg:gap-16">
        {/* Text */}
        <div className="flex-1 text-center lg:text-left">
          {pill && (
            <div className="mb-6">
              <SectionPill>{pill}</SectionPill>
            </div>
          )}
          <WordReveal
            text={title}
            as="h1"
            highlightWords={highlightWords}
            className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl lg:text-6xl lg:justify-start"
          />
          <motion.p
            className="mt-6 text-lg text-muted-foreground max-w-lg mx-auto lg:mx-0"
            initial={prefersReducedMotion ? {} : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.6 }}
          >
            {subtitle}
          </motion.p>
          {children && (
            <motion.div
              className="mt-8 flex flex-col sm:flex-row gap-4 justify-center lg:justify-start"
              initial={prefersReducedMotion ? {} : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.8 }}
            >
              {children}
            </motion.div>
          )}
        </div>

        {/* Image */}
        <div className="hidden lg:block w-72 xl:w-80 shrink-0">
          <ClipPathImage
            src={imageSrc}
            alt={imageAlt}
            width={1200}
            height={1500}
            className="aspect-[4/5] rounded-3xl shadow-2xl dark:shadow-black/40 ring-1 ring-black/5 dark:ring-white/10"
            direction="right"
            priority
          />
        </div>
      </div>
    </section>
  );
}
