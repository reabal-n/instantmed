"use client";

import { motion } from "framer-motion";
import { useRef } from "react";

import { WordReveal } from "@/components/ui/morning/word-reveal";
import { useReducedMotion,useScrollReveal } from "@/components/ui/motion";
import { SectionPill } from "@/components/ui/section-pill";
import { cn } from "@/lib/utils";

interface SectionHeaderProps {
  pill?: string;
  title: string;
  subtitle?: string;
  highlightWords?: string[];
  align?: "left" | "center";
  className?: string;
  titleAs?: "h1" | "h2" | "h3";
}

export function SectionHeader({
  pill,
  title,
  subtitle,
  highlightWords,
  align = "center",
  className,
  titleAs = "h2",
}: SectionHeaderProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useScrollReveal(ref);
  const prefersReducedMotion = useReducedMotion();

  return (
    <div
      ref={ref}
      className={cn(
        "mb-12 max-w-3xl",
        align === "center" ? "mx-auto text-center" : "text-left",
        className
      )}
    >
      {pill && (
        <div className="mb-4">
          <SectionPill>{pill}</SectionPill>
        </div>
      )}

      <WordReveal
        text={title}
        as={titleAs}
        highlightWords={highlightWords}
        className={cn(
          "text-3xl font-bold tracking-tight text-foreground sm:text-4xl",
          align === "center" && "justify-center"
        )}
      />

      {subtitle && (
        <motion.p
          className="mt-4 text-lg text-muted-foreground leading-relaxed"
          initial={prefersReducedMotion ? {} : { y: 8 }}
          animate={
            prefersReducedMotion
              ? {}
              : isInView
                ? { opacity: 1, y: 0 }
                : undefined
          }
          transition={{ duration: 0.3, delay: 0.3, ease: "easeOut" }}
        >
          {subtitle}
        </motion.p>
      )}
    </div>
  );
}
