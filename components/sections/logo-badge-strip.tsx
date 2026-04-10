"use client";

import { motion } from "framer-motion";
import { useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useScrollReveal, useReducedMotion } from "@/components/ui/motion";
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
  const isInView = useScrollReveal(ref);
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
            className="flex items-center gap-2 rounded-full border border-border/50 bg-muted/50 dark:bg-white/[0.06] px-4 py-2 text-xs text-muted-foreground"
            initial={prefersReducedMotion ? {} : { scale: 0.9 }}
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
