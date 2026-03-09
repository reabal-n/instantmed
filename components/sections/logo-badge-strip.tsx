"use client";

import { motion, useInView, useReducedMotion } from "framer-motion";
import { useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { scrollRevealConfig } from "@/components/ui/motion";
import type { SectionProps } from "./types";

interface Badge {
  icon: ReactNode;
  label: string;
}

interface LogoBadgeStripProps extends SectionProps {
  badges: Badge[];
}

export function LogoBadgeStrip({
  badges,
  className,
  id,
}: LogoBadgeStripProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, {
    once: scrollRevealConfig.once,
    amount: scrollRevealConfig.threshold,
  });
  const prefersReducedMotion = useReducedMotion();

  return (
    <section id={id} className={cn("py-10 px-4", className)}>
      <div
        ref={ref}
        className="mx-auto max-w-4xl flex flex-wrap items-center justify-center gap-6"
      >
        {badges.map((badge, i) => (
          <motion.div
            key={badge.label}
            className="flex items-center gap-2 rounded-full border border-border/50 bg-card/60 dark:bg-white/8 backdrop-blur-sm px-4 py-2 text-xs text-muted-foreground"
            initial={prefersReducedMotion ? {} : { opacity: 0, scale: 0.9 }}
            animate={
              prefersReducedMotion
                ? {}
                : isInView
                  ? { opacity: 1, scale: 1 }
                  : undefined
            }
            transition={{
              duration: 0.3,
              delay: i * 0.06,
              ease: "easeOut",
            }}
          >
            <span className="text-primary">{badge.icon}</span>
            <span>{badge.label}</span>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
