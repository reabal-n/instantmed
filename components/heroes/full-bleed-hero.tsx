"use client";

import { motion } from "framer-motion"
import { useReducedMotion } from "@/components/ui/motion";
import { type ReactNode } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { WordReveal } from "@/components/ui/morning/word-reveal";
import { SectionPill } from "@/components/ui/section-pill";

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
            <div className="mb-6">
              <SectionPill>{pill}</SectionPill>
            </div>
          )}
          <WordReveal
            text={title}
            as="h1"
            highlightWords={highlightWords}
            className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl lg:text-6xl justify-center"
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
